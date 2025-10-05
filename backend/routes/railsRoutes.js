// File: routes/railsRoutes.js
const express = require('express');
const fsp = require('fs/promises');
const path = require('path');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const Rail = require('../models/Rail');
const RailMetricsDaily = require('../models/RailMetricsDaily');
const RailSessionSeenDaily = require('../models/RailSessionSeenDaily');
const { normalizePlacementKey, allowedPlacementKeys } = require('../utils/placementTaxonomy');
const RailConfig = require('../models/RailConfig');
const RailDecisionLog = require('../models/RailDecisionLog');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { resolvePreset, listPresets } = require('../utils/railPresets');

const DATA_DIR = path.join(__dirname, '..', 'uploads');
const AUDIT_FILE = path.join(DATA_DIR, 'rails-audit.log.jsonl');

function utcDateStr(d = new Date()) { return d.toISOString().slice(0,10); }
function percentile(arr,p){ if(!arr.length) return 0; const idx=(p/100)*(arr.length-1); const lo=Math.floor(idx); const hi=Math.ceil(idx); if(lo===hi) return arr[lo]; const w=idx-lo; return arr[lo]*(1-w)+arr[hi]*w; }
function deriveSessionId(req,res){
  const COOKIE='railSessId';
  let sid = (req.headers.cookie||'').split(/; */).map(kv=>kv.split('=').map(s=>s.trim())).find(([k])=>k===COOKIE)?.[1];
  if(!sid){ sid = 'rs_'+Math.random().toString(36).slice(2,10); res.setHeader('Set-Cookie', `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax`); }
  return sid;
}

async function appendAudit(user, action, rail, diffSummary){
  try {
    await fsp.mkdir(DATA_DIR,{ recursive:true });
    const rec = {
      ts: new Date().toISOString(),
      action,
      railId: rail?.railId || null,
      user: user ? { id: user._id || user.id, email: user.email, role: user.role } : null,
      diff: diffSummary || null,
      snapshot: (rail && rail.title) ? { title: rail.title, status: rail.status, priority: rail.priority, type: rail.type, items: Array.isArray(rail.items)? rail.items.length : (rail.items||0) } : null
    };
    await fsp.appendFile(AUDIT_FILE, JSON.stringify(rec)+'\n','utf8');
  } catch(_){}
}

// ---------- Presets ----------
router.get('/admin/rails/presets', protect, authorize('admin','global_admin'), (req,res)=>{
  try { res.json({ presets: listPresets() }); }
  catch(err){ res.status(500).json({ message:'Failed to list presets' }); }
});

router.post('/admin/rails/presets/resolve', protect, authorize('admin','global_admin'), (req,res)=>{
  try {
    const name = (req.body && req.body.preset) || req.query.preset;
  const p = resolvePreset(name);
    if(!p) return res.status(404).json({ message:'Preset not found' });
  res.json({ name, tactic: p.tactic, allowedPlacements: p.allowed, defaults: p.defaults || undefined });
  } catch(err){ res.status(400).json({ message:'Failed to resolve preset' }); }
});

// ---------- Rails CRUD ----------
router.get('/admin/rails', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const {
      tactic, owner, environment, placementKey, opsStatus, status, search,
      page = 1, pageSize = 100
    } = req.query || {};
    const filter = {};
    if (tactic) filter.tactic = tactic;
    if (owner) filter.owner = owner;
    if (environment) filter.environment = environment;
  if (placementKey) filter.placementKey = normalizePlacementKey(placementKey);
    if (opsStatus) filter.opsStatus = opsStatus;
    if (status) filter.status = status; // legacy publish status
    if (search) {
      const s = String(search).trim();
      filter.$or = [
        { railId: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { title: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { displayName: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      ];
    }
    const pg = Math.max(1, Number(page)||1);
    const ps = Math.min(200, Math.max(1, Number(pageSize)||100));
    const total = await Rail.countDocuments(filter);
    const rails = await Rail.find(filter).sort({ 'meta.updatedAtUTC': -1 }).skip((pg-1)*ps).limit(ps).lean();
    res.json({ rails, total, page: pg, pageSize: ps });
  }
  catch(err){ res.status(500).json({ message:'Failed to list rails' }); }
});

// Bulk update selected fields (owner, placementKey, opsStatus)
router.patch('/admin/rails/bulk', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const { railIds, updates } = req.body || {};
    const ids = Array.isArray(railIds) ? railIds : [];
    if (!ids.length) return res.status(400).json({ message:'railIds required' });
  const allowed = ['owner','placementKey','opsStatus'];
    const set = {};
  allowed.forEach(k=>{ if(Object.prototype.hasOwnProperty.call(updates||{}, k)) set[k] = updates[k]; });
  if (set.placementKey) set.placementKey = normalizePlacementKey(set.placementKey);
    if (!Object.keys(set).length) return res.status(400).json({ message:'no valid updates' });
    set['meta.updatedAtUTC'] = new Date();
    const r = await Rail.updateMany({ railId: { $in: ids } }, { $set: set });
    res.json({ updated: r.modifiedCount||0 });
  } catch(err){ res.status(400).json({ message:'Failed bulk update', error: err.message }); }
});

router.post('/admin/rails', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const body = req.body || {};
    // Apply preset autofill if provided
    if (body.preset && !body.tactic) {
      const p = resolvePreset(body.preset);
      if (p) body.tactic = p.tactic;
    }
    if (body.placementKey) body.placementKey = normalizePlacementKey(body.placementKey);
    if (body.placementKey) {
      const okList = allowedPlacementKeys();
      if (!okList.includes(body.placementKey)) return res.status(400).json({ message: 'Invalid placementKey' });
    }
    const railId = body.railId || `rail_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const rail = await Rail.create({ ...body, railId });
    await appendAudit(req.user,'create',rail);
    res.status(201).json({ rail });
  } catch(err){ res.status(400).json({ message:'Failed to create rail', error: err.message }); }
});

router.put('/admin/rails/:railId', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const rail = await Rail.findOne({ railId: req.params.railId });
    if(!rail) return res.status(404).json({ message:'Rail not found' });
    const prev = rail.toObject();
    const patch = { ...(req.body||{}) };
    if (patch.placementKey) patch.placementKey = normalizePlacementKey(patch.placementKey);
    if (patch.placementKey) {
      const okList = allowedPlacementKeys();
      if (!okList.includes(patch.placementKey)) return res.status(400).json({ message: 'Invalid placementKey' });
    }
    // Allow preset to adjust tactic if not explicitly provided on update
    if (patch.preset && !patch.tactic) {
      const p = resolvePreset(patch.preset);
      if (p) patch.tactic = p.tactic;
    }
    Object.assign(rail, patch);
    rail.meta.updatedAtUTC = new Date();
    await rail.save();
    const changed = Object.keys(req.body||{}).filter(k=>JSON.stringify(prev[k])!==JSON.stringify(rail[k]));
    await appendAudit(req.user,'update',rail,{ changed });
    res.json({ rail });
  } catch(err){ res.status(400).json({ message:'Failed to update rail', error: err.message }); }
});

router.delete('/admin/rails/:railId', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const rail = await Rail.findOne({ railId: req.params.railId });
    if(!rail) return res.status(404).json({ message:'Rail not found' });
    await rail.deleteOne();
    await appendAudit(req.user,'delete',{ railId: rail.railId, title: rail.title, items: rail.items||[] });
    res.json({ ok:true });
  } catch(err){ res.status(400).json({ message:'Failed to delete rail', error: err.message }); }
});

router.post('/admin/rails/duplicate/:railId', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const src = await Rail.findOne({ railId: req.params.railId });
    if(!src) return res.status(404).json({ message:'Rail not found' });
    const copy = src.toObject(); delete copy._id; delete copy.id;
    copy.railId = `rail_${Date.now()}_${Math.random().toString(36).slice(2,5)}`;
    copy.title = copy.title + ' (Copy)';
    copy.status = 'draft';
    const rail = await Rail.create(copy);
    await appendAudit(req.user,'duplicate',rail);
    res.status(201).json({ rail });
  } catch(err){ res.status(400).json({ message:'Failed to duplicate rail', error: err.message }); }
});

// ---------- Audit Log ----------
router.get('/admin/rails/audit', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const limit = Math.min(1000, Number(req.query.limit)||200);
    let lines=[]; try { const raw = await fsp.readFile(AUDIT_FILE,'utf8'); lines = raw.trim().split(/\n+/g).filter(Boolean); } catch(_){}
    const entries = lines.slice(-limit).map(l=>{ try { return JSON.parse(l); } catch(_){ return null; } }).filter(Boolean).reverse();
    res.json({ entries });
  } catch(err){ res.status(500).json({ message:'Failed to read audit log' }); }
});

// ---------- Metrics Flush ----------
router.post('/rails/metrics/flush', async (req,res)=>{
  try {
    const sid = deriveSessionId(req,res);
    const body = req.body || {};
    const events = Array.isArray(body.events)? body.events : [];
  const sessionRails = new Set();
    const date = utcDateStr();
    const auditSummary = { imp:0, clk:0, atc:0, rev:0, suppression:0, sessions:0, rails:0 };
    for(const ev of events){
      if(!ev || !ev.railId) continue;
      const update = { $inc: {} };
      const pathBase = { railId: ev.railId, date };
      if(ev.type === 'imp') update.$inc.imp = ev.count||1;
      if(ev.type === 'clk') update.$inc.clk = ev.count||1;
      if(ev.type === 'atc') { update.$inc.atc = ev.count||1; if(ev.rev) update.$inc.rev = Number(ev.rev)||0; }
      if(ev.type === 'suppression') {
        const field = ev.subtype === 'capacityTrim' ? 'suppression.capacityTrim'
          : ev.subtype === 'capacityRail' ? 'suppression.capacityRail'
          : ev.subtype === 'siteSponsored' ? 'suppression.siteSponsored'
          : 'suppression.sponsored';
        update.$inc[field] = ev.count||1;
      }
      if(ev.type === 'item' && ev.subtype === 'clk' && ev.sku) update.$inc[`item.clkItems.${ev.sku}`] = ev.count||1;
      if(ev.type === 'item' && ev.subtype === 'atc' && ev.sku) update.$inc[`item.atcItems.${ev.sku}`] = ev.count||1;
      if(ev.type === 'imp') sessionRails.add(ev.railId);
      if(Object.keys(update.$inc).length){
        await RailMetricsDaily.findOneAndUpdate(pathBase, update, { upsert:true, new:true });
        auditSummary.imp += update.$inc.imp||0; auditSummary.clk += update.$inc.clk||0; auditSummary.atc += update.$inc.atc||0; auditSummary.rev += update.$inc.rev||0;
        ['suppression.sponsored','suppression.capacityTrim','suppression.capacityRail','suppression.siteSponsored'].forEach(k=>{ if(update.$inc[k]) auditSummary.suppression += update.$inc[k]; });
      }
    }
    // Session uniqueness: only count first imp per (railId, date, sessionId)
    for(const railId of sessionRails){
      try {
        const seenDoc = await RailSessionSeenDaily.findOneAndUpdate(
          { railId, date, sessionId: sid },
          { $setOnInsert: { createdAtUTC: new Date() } },
          { upsert: true, new: false }
        );
        if(!seenDoc){
          await RailMetricsDaily.findOneAndUpdate({ railId, date }, { $inc: { sessions:1 } }, { upsert:true, new:true });
          auditSummary.sessions += 1;
        }
      } catch(e){
        // Only ignore duplicate key errors (race conditions); surface others for visibility
        if(!(e && e.code === 11000)){
          // Non-duplicate errors are logged in audit for diagnostic purposes (best-effort)
          try { await appendAudit(null,'metrics_flush_error',{ railId }, { sessionId: sid, error: e.message }); } catch(_){ }
        }
      }
    }
    auditSummary.rails = sessionRails.size;
    try { await appendAudit(null,'metrics_flush',{ railId: sessionRails.size===1?Array.from(sessionRails)[0]:null }, { sessionId: sid, ...auditSummary }); } catch(_){ }
    res.json({ ok:true, processed: events.length });
  } catch(err){ res.status(400).json({ message:'Failed to flush metrics', error: err.message }); }
});

// ---------- Metrics Aggregation (enhanced with percentile baselines) ----------
router.get('/admin/rails/metrics', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const windowDays = Math.min(60, Math.max(1, Number(req.query.window)||7));
    const baselineDays = Math.min(120, Math.max(windowDays, Number(req.query.baseline)||28));
    const now = new Date();
    const cutoff = new Date(now.getTime() - windowDays*86400000);
    const baselineCut = new Date(now.getTime() - baselineDays*86400000);
    const sevenCut = new Date(now.getTime() - 7*86400000);
    const cutoffStr = utcDateStr(cutoff);
    const baselineCutStr = utcDateStr(baselineCut);
    const sevenCutStr = utcDateStr(sevenCut);
  // Optional filters to support Saved Views (tactics/workspaces)
  const filter = {};
  if (req.query.tactic) filter.tactic = req.query.tactic;
  if (req.query.owner) filter.owner = req.query.owner;
  if (req.query.environment) filter.environment = req.query.environment;
  if (req.query.placementKey) filter.placementKey = req.query.placementKey;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.opsStatus) filter.opsStatus = req.query.opsStatus;
  const rails = await Rail.find(filter).lean();
    const railIds = rails.map(r=>r.railId);
  const docs = await RailMetricsDaily.find({ railId: { $in: railIds }, date: { $gte: baselineCutStr } }).lean();
    const byRail={}, baseByRail={}, last7ByRail={};
    for(const id of railIds){
      byRail[id]={ imp:0, clk:0, atc:0, rev:0, sessions:0, suppression:{ sponsored:0, capacityTrim:0, capacityRail:0, siteSponsored:0 } };
      baseByRail[id]={ imp:0, clk:0, atc:0, rev:0, sessions:0 };
      last7ByRail[id]={ imp:0, clk:0, atc:0 };
    }
    // Per-rail daily ratio collection for per-rail baselines
    const perRailSeries = {}; // railId -> { ctr:[], atc:[], rpm:[] }
    railIds.forEach(id=> perRailSeries[id] = { ctr:[], atc:[], rpm:[] });
    for(const d of docs){
      if(d.date >= cutoffStr){ const t = byRail[d.railId]; if(t){ t.imp+=d.imp; t.clk+=d.clk; t.atc+=d.atc; t.rev+=d.rev; t.sessions+=d.sessions; if(d.suppression){ Object.keys(t.suppression).forEach(k=>{ t.suppression[k]+= (d.suppression[k]||0); }); }} }
      if(d.date >= baselineCutStr){ const b = baseByRail[d.railId]; if(b){ b.imp+=d.imp; b.clk+=d.clk; b.atc+=d.atc; b.rev+=d.rev; b.sessions+=d.sessions; }}
      if(d.date >= sevenCutStr){ const s = last7ByRail[d.railId]; if(s){ s.imp+=d.imp; s.clk+=d.clk; s.atc+=d.atc; }}
      const prs = perRailSeries[d.railId];
      if(prs){
        if(d.imp>0){ prs.ctr.push(d.clk/d.imp); prs.rpm.push((d.rev/d.imp)||0); }
        if(d.clk>0){ prs.atc.push(d.atc/d.clk); }
      }
    }
    const ctrArr=[], atcArr=[], rpmArr=[], ctrArr7=[], atcArr7=[];
    Object.values(baseByRail).forEach(m=>{ if(m.imp>0){ ctrArr.push(m.clk/m.imp); rpmArr.push(m.rev/(m.imp||1)); } if(m.clk>0){ atcArr.push(m.atc/m.clk); } });
    Object.values(last7ByRail).forEach(m=>{ if(m.imp>0){ ctrArr7.push(m.clk/m.imp); } if(m.clk>0){ atcArr7.push(m.atc/m.clk); } });
    const sortNum=(a,b)=>a-b; ctrArr.sort(sortNum); atcArr.sort(sortNum); rpmArr.sort(sortNum); ctrArr7.sort(sortNum); atcArr7.sort(sortNum);
    const baseline = {
      windowDays, baselineDays,
      ctr: { p30: percentile(ctrArr,30), p50: percentile(ctrArr,50), p70: percentile(ctrArr,70) },
      atc: { p30: percentile(atcArr,30), p50: percentile(atcArr,50), p70: percentile(atcArr,70) },
      rpm: { p80: percentile(rpmArr,80) },
      sevenDay: {
        ctr: { p30: percentile(ctrArr7,30), p50: percentile(ctrArr7,50), p70: percentile(ctrArr7,70) },
        atc: { p30: percentile(atcArr7,30), p50: percentile(atcArr7,50), p70: percentile(atcArr7,70) }
      }
    };
    // Detect conflicts for single-slot placements (heuristic: same placementKey and opsStatus=active in Prod)
    const singleSlots = new Set(['CategoryTop','HeroTop']);
    const slotBuckets = {};
    rails.forEach(r => {
      const key = `${r.placementKey||''}|${r.environment||''}|${r.opsStatus||''}`;
      if (singleSlots.has(r.placementKey) && r.environment === 'Prod' && r.opsStatus === 'active') {
        slotBuckets[key] = slotBuckets[key] || [];
        slotBuckets[key].push(r.railId);
      }
    });
    const conflicted = new Set(Object.values(slotBuckets).filter(a=>a.length>1).flat());

    const data = rails.map(r=>{
      const m = byRail[r.railId];
      const ctr = m.imp? m.clk/m.imp:0; const atcRate = m.clk? m.atc/m.clk:0; const revPerImp = m.imp? m.rev/m.imp:0; const rpm = revPerImp*1000; const revPerSession = m.sessions? m.rev/m.sessions:0;
  const reasons=[];
      if(ctr < baseline.ctr.p30) reasons.push('LOW_CTR');
      if(atcRate < baseline.atc.p30) reasons.push('LOW_ATC');
      if(rpm >= baseline.rpm.p80 && rpm>0) reasons.push('HIGH_RPM');
      const perRailSupp = (m.suppression?.sponsored||0);
      const siteSupp = (m.suppression?.siteSponsored||0);
      // Tag granular cap reasons (light heuristic: any presence)
      if(perRailSupp>0) reasons.push('CAP_PER_RAIL');
      if(siteSupp>0) reasons.push('CAP_SITE');
      const totalSupp = perRailSupp + siteSupp;
      if(totalSupp>0 && m.imp>0 && totalSupp >= Math.max(3, m.imp*0.5)) reasons.push('SUPPRESSION_HIGH');
      let recommendation='KEEP';
      // Granular sponsored cap based recommendations take precedence
      const capPer = reasons.includes('CAP_PER_RAIL');
      const capSite = reasons.includes('CAP_SITE');
      if(capPer && capSite) recommendation='SPONSORED_CAP_MULTI';
      else if(capPer) recommendation='SPONSORED_CAP_PER_RAIL';
      else if(capSite) recommendation='SPONSORED_CAP_SITE';
      else if(reasons.includes('SUPPRESSION_HIGH')) recommendation='SPONSORED_CAP_HIT';
      else if(reasons.includes('LOW_CTR') && reasons.includes('LOW_ATC')) recommendation='ROTATE_CONTENT';
      else if(reasons.includes('HIGH_RPM')) recommendation='BOOST_PLACEMENT';
      // Per-rail baseline percentiles from its own series
      const prs = perRailSeries[r.railId] || { ctr:[], atc:[], rpm:[] };
      prs.ctr.sort(sortNum); prs.atc.sort(sortNum); prs.rpm.sort(sortNum);
      const perRailBaseline = {
        sampleDays: prs.ctr.length,
        ctr: { p30: percentile(prs.ctr,30), p50: percentile(prs.ctr,50), p70: percentile(prs.ctr,70) },
        atc: { p30: percentile(prs.atc,30), p50: percentile(prs.atc,50), p70: percentile(prs.atc,70) },
        rpm: { p80: percentile(prs.rpm,80) }
      };
      // Derive badges from reasons + sponsored caps
  const badges = [];
      if (reasons.includes('CAP_PER_RAIL')) badges.push('CAP_PER_RAIL');
      if (reasons.includes('CAP_SITE')) badges.push('CAP_SITE');
      if (reasons.includes('SPONSORED_CAP_MULTI')) badges.push('CAP_MULTI');
      if (r.type === 'sponsored' || r.tactic === 'Sponsored') badges.push('SPONSORED');
  if (conflicted.has(r.railId)) { reasons.push('CONFLICT'); badges.push('CONFLICT'); }

      return {
        railId: r.railId,
        title: r.title,
        displayName: r.displayName || r.title,
        status: r.status,
        opsStatus: r.opsStatus,
        tactic: r.tactic,
        category: r.category,
        placementKey: r.placementKey,
        environment: r.environment,
        owner: r.owner,
        variant: r.variant,
        badges,
        placement: r.placement,
        type: r.type,
        priority: r.priority,
        updatedAtUTC: r.meta && r.meta.updatedAtUTC ? new Date(r.meta.updatedAtUTC).toISOString() : null,
        metrics: { ...m, ctr, atcRate, revPerImp, rpm, revPerSession },
        deltas: { ctrDeltaPp: (ctr - baseline.ctr.p50)*100, atcDeltaPp: (atcRate - baseline.atc.p50)*100 },
        recommendation,
        reasons,
        perRailBaseline
      };
    });
    // Optional de-duplication to avoid visually duplicated rows for same-named rails
    // Enabled by default for UI; override with ?distinct=none to show all
    const distinctMode = (req.query.distinct || 'title').toLowerCase();
    let output = data;
    if (distinctMode === 'title' || distinctMode === 'displayname') {
      const seen = new Set();
      const keyOf = (r)=> String((r.displayName||r.title||'').toLowerCase());
      // Prefer most recently updated rail if duplicates share the same name
      output = data
        .sort((a,b)=>{
          const ta = a.updatedAtUTC ? new Date(a.updatedAtUTC).getTime() : 0;
          const tb = b.updatedAtUTC ? new Date(b.updatedAtUTC).getTime() : 0;
          return tb - ta;
        })
        .filter(r=>{
          const k = keyOf(r);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
    }
    res.json({ windowDays, baselineDays, generatedAt: new Date().toISOString(), timezone:'UTC', baseline, rails: output });
  } catch(err){ res.status(500).json({ message:'Failed to aggregate metrics', error: err.message }); }
});

// ---------- Metrics Summary (site-level) ----------
router.get('/admin/rails/metrics/summary', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const days = Math.min(60, Math.max(1, Number(req.query.window)||7));
    const now = new Date();
    const cutoffStr = utcDateStr(new Date(now.getTime() - days*86400000));
    const docs = await RailMetricsDaily.find({ date: { $gte: cutoffStr } }).lean();
    const site = { imp:0, clk:0, atc:0, rev:0, sessions:0, suppression:{ sponsored:0, capacityTrim:0, capacityRail:0, siteSponsored:0 } };
    for(const d of docs){ site.imp+=d.imp; site.clk+=d.clk; site.atc+=d.atc; site.rev+=d.rev; site.sessions+=d.sessions; if(d.suppression){ Object.keys(site.suppression).forEach(k=>{ site.suppression[k]+=(d.suppression[k]||0); }); } }
    const ctr = site.imp? site.clk/site.imp:0; const atcRate = site.clk? site.atc/site.clk:0; const rpm = site.imp? (site.rev/site.imp)*1000:0;
    res.json({ windowDays: days, generatedAt: new Date().toISOString(), site: { ...site, ctr, atcRate, rpm } });
  } catch(err){ res.status(500).json({ message:'Failed to build metrics summary', error: err.message }); }
});

// ---------- Selection (feature-flagged, shadow mode) ----------
router.get('/admin/rails/selection', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const enabled = process.env.RAILS_SELECTION_V1 === 'true';
    if (!enabled) {
      return res.status(501).json({ message: 'Selection engine disabled', flag: 'RAILS_SELECTION_V1=false' });
    }
    const surface = String(req.query.surface || 'home').toLowerCase(); // home, category, deals, brand, pdp, cart
    const form = String(req.query.form || 'desktop').toLowerCase(); // desktop|mobile
    const startedAt = Date.now();
    const decisionLogs = [];

    // Load operator knobs
    const cfg = (await RailConfig.findById('default').lean()) || {};
    if (cfg.killSwitch === true || process.env.RAILS_SELECTION_DISABLE === 'true') {
      return res.status(200).json({ ok: false, message: 'Selection disabled by kill switch', selection: [], decisionLogs: [{ step:'killswitch' }] });
    }

    // Candidates: active Prod rails for allowed placements per surface
    const allowPlacements = cfg.selection?.surfaces?.[surface]?.placements || (surface==='home' ? ['HeroTop','HeroBelow','Mid'] : []);
    const filter = { environment: 'Prod', opsStatus: 'active' };
    if (allowPlacements.length) filter.placementKey = { $in: allowPlacements };
    // Lightweight context for targeting
    const userRegion = String(req.headers['x-user-region'] || req.query.region || 'US').toUpperCase();
    const userLang = String(req.headers['x-user-lang'] || req.query.lang || 'en').toLowerCase();
    const pageCategory = req.query.pageCategory ? String(req.query.pageCategory) : undefined;
    let candidates = await Rail.find(filter).sort({ priority: -1, 'meta.updatedAtUTC': -1 }).limit(100).lean();
    // Apply simple targeting rules (regions, languages, categories)
    candidates = candidates.filter(r => {
      const t = r.targeting || {};
      const regions = Array.isArray(t.regions) ? t.regions.map(x=>String(x).toUpperCase()) : [];
      const langs = Array.isArray(t.languages) ? t.languages.map(x=>String(x).toLowerCase()) : ['all'];
      const cats = Array.isArray(t.categories) ? t.categories : [];
      const regionOk = regions.length === 0 || regions.includes('ALL') || regions.includes(userRegion);
      const langOk = langs.includes('all') || langs.some(l => userLang.startsWith(l));
      const catOk = !pageCategory || cats.length === 0 || cats.includes(pageCategory);
      return regionOk && langOk && catOk;
    });
    decisionLogs.push({ at: new Date().toISOString(), step: 'candidates_fetched', count: candidates.length, surface, form });

    // Compute recent metrics snapshot for floors (7d)
    const sevenCutStr = utcDateStr(new Date(Date.now() - 7*86400000));
    const counts = await RailMetricsDaily.aggregate([
      { $match: { railId: { $in: candidates.map(c=>c.railId) }, date: { $gte: sevenCutStr } } },
      { $group: { _id: '$railId', imp: { $sum: '$imp' }, rev: { $sum: '$rev' } } }
    ]);
    const byId = Object.fromEntries(counts.map(c => [c._id, c]));

    // Score, apply floors, and one-per-category for CategoryTop
    const maxRails = cfg.selection?.maxRails || 5;
    const wPriority = cfg.weights?.priority ?? 10;
    const recDiv = cfg.weights?.recencyMsDivisor ?? 1e12;
    const heroImpMin7d = cfg.floors?.heroImpMin7d ?? 100;
    const rpmQuantileMin = cfg.floors?.rpmQuantileMin ?? 25;

    // Compute RPM quantile cutoff across candidates for floor enforcement
    const rpmValues = candidates.map(c=>{
      const m = byId[c.railId] || { imp:0, rev:0 };
      return m.imp>0 ? (m.rev/m.imp)*1000 : 0;
    }).sort((a,b)=>a-b);
    const rpmCutoff = percentile(rpmValues, rpmQuantileMin);

    const seenCategoryTop = new Set();
    const enriched = candidates.map((r, i) => {
      const recent = r.meta?.updatedAtUTC ? new Date(r.meta.updatedAtUTC).getTime() / recDiv : 0;
      const score = (r.priority || 0) * wPriority + recent;
      const key = r.placementKey;
      const floorIssues = [];
      const c = byId[r.railId] || { imp:0, rev:0 };
      const rpm = c.imp > 0 ? (c.rev / c.imp) * 1000 : 0;
      if (key === 'HeroTop' && c.imp < heroImpMin7d) floorIssues.push('HERO_IMP_FLOOR');
      if (rpmQuantileMin > 0 && rpm < rpmCutoff) floorIssues.push('RPM_FLOOR');
      return { r, score, rpm, floorIssues, rankHint: i };
    });

    // Sort by score descending
    enriched.sort((a,b)=> b.score - a.score);

  let picked = [];
    let suppressedItems = 0; let suppressedRails = 0; const suppressedReasons = new Set();
    for (const e of enriched) {
      const r = e.r;
      // One-per-category for CategoryTop
      if (r.placementKey === 'CategoryTop' && r.category) {
        const k = r.category.toLowerCase();
        if (seenCategoryTop.has(k)) { suppressedRails++; suppressedReasons.add('CATEGORY_UNIQUE'); continue; }
        seenCategoryTop.add(k);
      }
      // Quality floors
      if (e.floorIssues.length) { suppressedRails++; suppressedReasons.add(...e.floorIssues); continue; }
      picked.push({
        railId: r.railId,
        title: r.title,
        displayName: r.displayName || r.title,
        placementKey: r.placementKey,
        tactic: r.tactic,
        priority: r.priority || 0,
        rpm: e.rpm,
        score: e.score
      });
      if (picked.length >= maxRails) break;
    }

    // Inventory/region gating and item dedupe across picked rails (by sku)
    // Batch product fetch for availability
  const allSkus = Array.from(new Set(picked.flatMap(p => {
      const full = candidates.find(c => c.railId === p.railId);
      return Array.isArray(full?.items) ? full.items.map(i=>i.sku).filter(Boolean) : [];
    })));
    // Harden product lookups: only include valid ObjectIds in _id query to avoid cast errors
    let products = [];
    if (allSkus.length) {
      try {
        const validIds = allSkus.filter(id => mongoose.Types.ObjectId.isValid(id));
        const orClauses = [{ sku: { $in: allSkus } }];
        if (validIds.length) orClauses.push({ _id: { $in: validIds } });
        products = await Product.find({ $or: orClauses }).select('sku stock').lean();
      } catch (e) {
        // Gracefully degrade: treat as no products found and log reason in decision logs
        decisionLogs.push({ at: new Date().toISOString(), step: 'product_lookup_failed', error: e.message, skuCount: allSkus.length });
        products = [];
      }
    }
    const bySku = Object.create(null);
    for (const pr of products) {
      const key = (pr.sku || pr._id || '').toString();
      if (key) bySku[key.toLowerCase()] = pr;
    }
    const seenSku = new Set();
    const minItemsDefault = 0;
    picked = picked.filter(p => {
      const full = candidates.find(c => c.railId === p.railId);
      const items = Array.isArray(full?.items) ? full.items : [];
      const deduped = [];
      for (const it of items) {
        if (!it || !it.sku) continue;
        const sku = String(it.sku);
        const key = sku.toLowerCase();
        const prod = bySku[key];
        if (prod && typeof prod.stock === 'number' && prod.stock <= 0) { suppressedItems++; continue; }
        if (seenSku.has(key)) { suppressedItems++; continue; }
        seenSku.add(key);
        deduped.push(it);
      }
      const capacity = full?.capacity || {};
      const minItems = typeof capacity.minItems === 'number' ? capacity.minItems : minItemsDefault;
      if (minItems && deduped.length < minItems) { suppressedRails++; return false; }
      p.items = deduped;
      return true;
    });

    const durationMs = Date.now() - startedAt;
    const selection = picked;
    decisionLogs.push({ at: new Date().toISOString(), step: 'selected', selectionCount: selection.length, durationMs, suppressedItems, suppressedRails });

    // Persist decision log (best-effort)
    try {
      await RailDecisionLog.create({ ts: new Date(), surface, form, selection, suppressed: { items: suppressedItems, rails: suppressedRails, reasons: Array.from(suppressedReasons) }, durationMs, meta: { cfgVersion: cfg.updatedAtUTC } });
    } catch(_){ }

    return res.json({ ok: true, surface, form, count: selection.length, selection, decisionLogs });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to select rails', error: err.message });
  }
});

// ---------- Live selection endpoint (used by frontend) ----------
router.get('/rails/selection', async (req,res)=>{
  try {
    const flagEnabled = process.env.RAILS_SELECTION_V1 === 'true';
    const cfg = (await RailConfig.findById('default').lean()) || {};
    if (!flagEnabled || cfg.killSwitch === true || process.env.RAILS_SELECTION_DISABLE === 'true' || cfg.enabled === false) {
      return res.status(200).json({ ok:false, message: 'Selection disabled', selection: [] });
    }
    // Public live selection mirrors admin logic: scoring, floors, category uniqueness, and item de-duplication
    const surface = String(req.query.surface || 'home').toLowerCase();
    const form = String(req.query.form || 'desktop').toLowerCase();
    const allowPlacements = cfg.selection?.surfaces?.[surface]?.placements || (surface==='home' ? ['HeroTop','HeroBelow','Mid'] : []);
    const filter = { environment: 'Prod', opsStatus: 'active' };
    if (allowPlacements.length) filter.placementKey = { $in: allowPlacements };
    let candidates = await Rail.find(filter).sort({ priority: -1, 'meta.updatedAtUTC': -1 }).limit(100).lean();
    // Apply same targeting filter as admin view
    const userRegion = String(req.headers['x-user-region'] || req.query.region || 'US').toUpperCase();
    const userLang = String(req.headers['x-user-lang'] || req.query.lang || 'en').toLowerCase();
    const pageCategory = req.query.pageCategory ? String(req.query.pageCategory) : undefined;
    candidates = candidates.filter(r => {
      const t = r.targeting || {};
      const regions = Array.isArray(t.regions) ? t.regions.map(x=>String(x).toUpperCase()) : [];
      const langs = Array.isArray(t.languages) ? t.languages.map(x=>String(x).toLowerCase()) : ['all'];
      const cats = Array.isArray(t.categories) ? t.categories : [];
      const regionOk = regions.length === 0 || regions.includes('ALL') || regions.includes(userRegion);
      const langOk = langs.includes('all') || langs.some(l => userLang.startsWith(l));
      const catOk = !pageCategory || cats.length === 0 || cats.includes(pageCategory);
      return regionOk && langOk && catOk;
    });

    // Compute recent metrics snapshot for floors (7d)
    const sevenCutStr = utcDateStr(new Date(Date.now() - 7*86400000));
    const counts = await RailMetricsDaily.aggregate([
      { $match: { railId: { $in: candidates.map(c=>c.railId) }, date: { $gte: sevenCutStr } } },
      { $group: { _id: '$railId', imp: { $sum: '$imp' }, rev: { $sum: '$rev' } } }
    ]);
    const byId = Object.fromEntries(counts.map(c => [c._id, c]));

    const maxRails = cfg.selection?.maxRails || 5;
    const wPriority = cfg.weights?.priority ?? 10;
    const recDiv = cfg.weights?.recencyMsDivisor ?? 1e12;
    const heroImpMin7d = cfg.floors?.heroImpMin7d ?? 100;
    const rpmQuantileMin = cfg.floors?.rpmQuantileMin ?? 25;

    // Compute RPM quantile cutoff across candidates for floor enforcement
    const rpmValues = candidates.map(c=>{
      const m = byId[c.railId] || { imp:0, rev:0 };
      return m.imp>0 ? (m.rev/m.imp)*1000 : 0;
    }).sort((a,b)=>a-b);
    const rpmCutoff = percentile(rpmValues, rpmQuantileMin);

    const seenCategoryTop = new Set();
    const enriched = candidates.map((r, i) => {
      const recent = r.meta?.updatedAtUTC ? new Date(r.meta.updatedAtUTC).getTime() / recDiv : 0;
      const score = (r.priority || 0) * wPriority + recent;
      const key = r.placementKey;
      const floorIssues = [];
      const c = byId[r.railId] || { imp:0, rev:0 };
      const rpm = c.imp > 0 ? (c.rev / c.imp) * 1000 : 0;
      if (key === 'HeroTop' && c.imp < heroImpMin7d) floorIssues.push('HERO_IMP_FLOOR');
      if (rpmQuantileMin > 0 && rpm < rpmCutoff) floorIssues.push('RPM_FLOOR');
      return { r, score, rpm, floorIssues, rankHint: i };
    });

    // Sort by score descending
    enriched.sort((a,b)=> b.score - a.score);

  let picked = [];
    let suppressedItems = 0; let suppressedRails = 0;
    for (const e of enriched) {
      const r = e.r;
      // One-per-category for CategoryTop
      if (r.placementKey === 'CategoryTop' && r.category) {
        const k = r.category.toLowerCase();
        if (seenCategoryTop.has(k)) { suppressedRails++; continue; }
        seenCategoryTop.add(k);
      }
      // Quality floors
      if (e.floorIssues.length) { suppressedRails++; continue; }
      picked.push({
        railId: r.railId,
        title: r.title,
        displayName: r.displayName || r.title,
        placementKey: r.placementKey,
        tactic: r.tactic,
        priority: r.priority || 0,
        rpm: e.rpm,
        score: e.score
      });
      if (picked.length >= maxRails) break;
    }

    // Inventory/region gating and item dedupe across picked rails (by sku)
    const allSkus = Array.from(new Set(picked.flatMap(p => {
      const full = candidates.find(c => c.railId === p.railId);
      return Array.isArray(full?.items) ? full.items.map(i=>i.sku).filter(Boolean) : [];
    })));
    // Harden product lookups: only include valid ObjectIds in _id query to avoid cast errors
    let products = [];
    if (allSkus.length) {
      try {
        const validIds = allSkus.filter(id => mongoose.Types.ObjectId.isValid(id));
        const orClauses = [{ sku: { $in: allSkus } }];
        if (validIds.length) orClauses.push({ _id: { $in: validIds } });
        products = await Product.find({ $or: orClauses }).select('sku stock').lean();
      } catch (e) {
        // Gracefully degrade: treat as no products found
        products = [];
      }
    }
    const bySku = Object.create(null);
    for (const pr of products) {
      const key = (pr.sku || pr._id || '').toString();
      if (key) bySku[key.toLowerCase()] = pr;
    }
    const seenSku = new Set();
    const minItemsDefault = 0;
    picked = picked.filter(p => {
      const full = candidates.find(c => c.railId === p.railId);
      const items = Array.isArray(full?.items) ? full.items : [];
      const deduped = [];
      for (const it of items) {
        if (!it || !it.sku) continue;
        const sku = String(it.sku);
        const key = sku.toLowerCase();
        const prod = bySku[key];
        if (prod && typeof prod.stock === 'number' && prod.stock <= 0) { suppressedItems++; continue; }
        if (seenSku.has(key)) { suppressedItems++; continue; }
        seenSku.add(key);
        deduped.push(it);
      }
      const capacity = full?.capacity || {};
      const minItems = typeof capacity.minItems === 'number' ? capacity.minItems : minItemsDefault;
      if (minItems && deduped.length < minItems) { suppressedRails++; return false; }
      p.items = deduped;
      return true;
    });

    const selection = picked;
    return res.json({ ok:true, surface, form, count: selection.length, selection });
  } catch(err){
    return res.status(500).json({ message:'Failed to select rails', error: err.message });
  }
});

// ---------- Operator knobs: get/set config ----------
router.get('/admin/rails/config', protect, authorize('admin','global_admin'), async (req,res)=>{
  try { const cfg = await RailConfig.findById('default').lean(); res.json({ config: cfg||null }); }
  catch(err){ res.status(500).json({ message:'Failed to load config' }); }
});

router.put('/admin/rails/config', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const patch = req.body || {};
    const cfg = await RailConfig.findByIdAndUpdate('default', { $set: patch }, { upsert:true, new:true });
    res.json({ ok:true, config: cfg });
  } catch(err){ res.status(400).json({ message:'Failed to update config', error: err.message }); }
});

// ---------- Observability: SoV summary (share of voice by owner/tactic) ----------
router.get('/admin/rails/sov', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const days = Math.min(60, Math.max(1, Number(req.query.window)||7));
    const cutoffStr = utcDateStr(new Date(Date.now() - days*86400000));
    const match = { date: { $gte: cutoffStr } };
    const agg = await RailMetricsDaily.aggregate([
      { $match: match },
      { $lookup: { from: 'rails', localField: 'railId', foreignField: 'railId', as: 'rail' } },
      { $unwind: '$rail' },
      { $group: { _id: { owner: '$rail.owner', tactic: '$rail.tactic' }, imp: { $sum: '$imp' }, clk: { $sum: '$clk' }, rev: { $sum: '$rev' } } }
    ]);
    // Always include tactic key to satisfy clients/tests even if null/undefined
  let sov = agg.map(a=>({ owner: a._id && a._id.owner || '', tactic: (a._id && a._id.tactic) ?? 'Unknown', imp: a.imp, clk:a.clk, rev:a.rev }));
    // Defensive normalization: coerce all rows to include explicit keys and string tactic
    sov = sov.map(r => ({
      owner: r.owner || '',
      tactic: (r.tactic === undefined || r.tactic === null || r.tactic === '') ? 'Unknown' : String(r.tactic),
      imp: Number(r.imp)||0,
      clk: Number(r.clk)||0,
      rev: Number(r.rev)||0
    }));
  // Debug log to verify shape during tests
  // eslint-disable-next-line no-console
  console.log('[rails/sov] rows:', sov);
  res.json({ windowDays: days, sov });
  } catch(err){ res.status(500).json({ message:'Failed to compute SoV', error: err.message }); }
});

// ---------- Alerts: empty slot, cap breach, latency, stale rollups (basic) ----------
router.get('/admin/rails/alerts', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const cfg = (await RailConfig.findById('default').lean()) || {};
    const alerts = [];
    // Stale rollups: check latest metrics date
    const last = await RailMetricsDaily.findOne({}).sort({ date: -1 }).lean();
    if (!last || (new Date().getTime() - new Date(last.date).getTime())/86400000 > (cfg.alerts?.staleRollupDays || 2)) {
      alerts.push({ type:'STALE_ROLLUPS', message:'Metrics rollups appear stale' });
    }
    // Cap breach placeholder: if any suppression.siteSponsored spikes high in last 7 days
    const sevenCutStr = utcDateStr(new Date(Date.now() - 7*86400000));
    const capAgg = await RailMetricsDaily.aggregate([
      { $match: { date: { $gte: sevenCutStr } } },
      { $group: { _id:null, siteSupp: { $sum: '$suppression.siteSponsored' } } }
    ]);
    if ((capAgg[0]?.siteSupp||0) > 1000) alerts.push({ type:'CAP_SITE_HIGH', message:'High site-sponsored suppression observed' });

    // Empty slot and high latency from recent decision logs (last hour)
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recent = await RailDecisionLog.find({ ts: { $gte: oneHourAgo } }).sort({ ts: -1 }).limit(200).lean();
    const emptyEvents = recent.filter(r => Array.isArray(r.selection) && r.selection.length === 0).length;
    if (emptyEvents > 0) alerts.push({ type:'EMPTY_SELECTION', message:`Detected ${emptyEvents} empty-selection events in last hour` });
    const latencyMs = cfg.alerts?.selectionLatencyMs || 200;
    const slow = recent.filter(r => (r.durationMs||0) > latencyMs).length;
    if (slow > 0) alerts.push({ type:'SELECTION_SLOW', message:`Detected ${slow} slow selections > ${latencyMs}ms in last hour` });

    // Anomaly detection: compare last 1d vs baseline 7d for CTR and RPM swings per rail
    try {
      const oneDayCut = utcDateStr(new Date(Date.now() - 1*86400000));
      const sevenDayCut = utcDateStr(new Date(Date.now() - 7*86400000));
      const [last1d, base7d] = await Promise.all([
        RailMetricsDaily.aggregate([
          { $match: { date: { $gte: oneDayCut } } },
          { $group: { _id: '$railId', imp: { $sum: '$imp' }, clk: { $sum: '$clk' }, rev: { $sum: '$rev' } } }
        ]),
        RailMetricsDaily.aggregate([
          { $match: { date: { $gte: sevenDayCut } } },
          { $group: { _id: '$railId', imp: { $sum: '$imp' }, clk: { $sum: '$clk' }, rev: { $sum: '$rev' } } }
        ])
      ]);
      const by1 = Object.fromEntries(last1d.map(d=>[d._id,d]));
      const by7 = Object.fromEntries(base7d.map(d=>[d._id,d]));
      const thrCtr = cfg.alerts?.anomalyCtrPct ?? 50;
      const thrRpm = cfg.alerts?.anomalyRpmPct ?? 60;
      const anomalies = [];
      for (const [id, d7] of Object.entries(by7)){
        const d1 = by1[id];
        if (!d1 || d7.imp<=0 || d1.imp<=0) continue;
        const ctr7 = d7.clk/(d7.imp||1); const ctr1 = d1.clk/(d1.imp||1);
        const rpm7 = (d7.rev/(d7.imp||1))*1000; const rpm1 = (d1.rev/(d1.imp||1))*1000;
        const ctrDeltaPct = Math.abs((ctr1-ctr7)/(ctr7||1e-9))*100;
        const rpmDeltaPct = Math.abs((rpm1-rpm7)/(rpm7||1e-9))*100;
        const flags = [];
        if (ctrDeltaPct >= thrCtr) flags.push('CTR_SWING');
        if (rpmDeltaPct >= thrRpm) flags.push('RPM_SWING');
        if (flags.length) anomalies.push({ railId: id, flags, ctr1, ctr7, rpm1, rpm7 });
      }
      if (anomalies.length) alerts.push({ type:'ANOMALY', message:`${anomalies.length} rails show CTR/RPM swings`, details: anomalies.slice(0,50) });
    } catch(_){ /* non-fatal */ }

    // Freshness SLA: rails unchanged >= freshnessDays and CTR below freshness floor over 7d
    try {
      const freshnessDays = cfg.alerts?.freshnessDays ?? 14;
      const ctrFloor = cfg.alerts?.freshnessCtrFloor ?? 0.01;
      const staleCut = new Date(Date.now() - freshnessDays*86400000);
      const rails = await Rail.find({ 'meta.updatedAtUTC': { $lte: staleCut }, environment:'Prod', opsStatus:'active' }).select('railId title meta.updatedAtUTC').lean();
      if (rails.length){
        const ids = rails.map(r=>r.railId);
        const sevenCutStr = utcDateStr(new Date(Date.now() - 7*86400000));
        const docs = await RailMetricsDaily.aggregate([
          { $match: { railId: { $in: ids }, date: { $gte: sevenCutStr } } },
          { $group: { _id: '$railId', imp: { $sum: '$imp' }, clk: { $sum: '$clk' } } }
        ]);
        const by = Object.fromEntries(docs.map(d=>[d._id,d]));
        const stale = rails.filter(r => {
          const m = by[r.railId] || { imp:0, clk:0 };
          const ctr = m.imp ? m.clk/m.imp : 0;
          return ctr < ctrFloor;
        });
        if (stale.length) alerts.push({ type:'FRESHNESS_SLA', message:`${stale.length} rails stale ${freshnessDays}+ days with low CTR`, rails: stale.slice(0,50) });
      }
    } catch(_){ /* non-fatal */ }
    res.json({ alerts });
  } catch(err){ res.status(500).json({ message:'Failed to collect alerts', error: err.message }); }
});

// ---------- Backfill/Baselines: ensure last N days docs exist for active rails ----------
router.post('/admin/rails/backfill', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const windowDays = Math.min(120, Math.max(1, Number(req.body?.window||28)));
    const rails = await Rail.find({ environment:'Prod', opsStatus:'active' }).select('railId').lean();
    const railIds = rails.map(r=>r.railId);
    const dates = [];
    for (let i=0;i<windowDays;i++){
      dates.push(utcDateStr(new Date(Date.now() - i*86400000)));
    }
    let inserted = 0;
    for (const id of railIds){
      for (const date of dates){
        const r = await RailMetricsDaily.updateOne({ railId:id, date }, { $setOnInsert: { imp:0, clk:0, atc:0, rev:0, sessions:0 } }, { upsert:true });
        if (r && r.upsertedCount) inserted += r.upsertedCount;
      }
    }
    res.json({ ok:true, rails: railIds.length, days: windowDays, inserted });
  } catch(err){ res.status(400).json({ message:'Failed backfill', error: err.message }); }
});

// ---------- Per-Rail Metrics Detail ----------
router.get('/admin/rails/:railId/metrics', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const railId = req.params.railId;
    const rail = await Rail.findOne({ railId }).lean();
    if(!rail) return res.status(404).json({ message:'Rail not found' });
    const windowDays = Math.min(60, Math.max(1, Number(req.query.window)||7));
    const cutoffStr = utcDateStr(new Date(Date.now() - windowDays*86400000));
    const docs = await RailMetricsDaily.find({ railId, date: { $gte: cutoffStr } }).lean();
    const agg = { imp:0, clk:0, atc:0, rev:0, sessions:0, suppression:{ sponsored:0, capacityTrim:0, capacityRail:0, siteSponsored:0 }, item:{ clkItems:{}, atcItems:{} } };
    for(const d of docs){
      agg.imp+=d.imp; agg.clk+=d.clk; agg.atc+=d.atc; agg.rev+=d.rev; agg.sessions+=d.sessions;
      if(d.suppression){ Object.keys(agg.suppression).forEach(k=>{ agg.suppression[k]+=(d.suppression[k]||0); }); }
      if(d.item){
        const clkObj = d.item.clkItems instanceof Map ? Object.fromEntries(d.item.clkItems) : (d.item.clkItems||{});
        const atcObj = d.item.atcItems instanceof Map ? Object.fromEntries(d.item.atcItems) : (d.item.atcItems||{});
        for(const [sku,v] of Object.entries(clkObj)){ agg.item.clkItems[sku]=(agg.item.clkItems[sku]||0)+v; }
        for(const [sku,v] of Object.entries(atcObj)){ agg.item.atcItems[sku]=(agg.item.atcItems[sku]||0)+v; }
      }
    }
    const ctr = agg.imp? agg.clk/agg.imp:0; const atcRate = agg.clk? agg.atc/agg.clk:0; const rpm = agg.imp? (agg.rev/agg.imp)*1000:0; const revPerSession = agg.sessions? agg.rev/agg.sessions:0;
    res.json({
      railId,
      windowDays,
      generatedAt: new Date().toISOString(),
      rail:{
        title: rail.title,
        displayName: rail.displayName || rail.title,
        status: rail.status,
        opsStatus: rail.opsStatus,
        tactic: rail.tactic,
        category: rail.category,
        placementKey: rail.placementKey,
        environment: rail.environment,
        owner: rail.owner,
        variant: rail.variant,
        placement: rail.placement,
        type: rail.type,
        priority: rail.priority
      },
      metrics:{ ...agg, ctr, atcRate, rpm, revPerSession }
    });
  } catch(err){ res.status(500).json({ message:'Failed to get rail metrics', error: err.message }); }
});

// ---------- Pre-flight ----------
router.post('/admin/rails/preflight', protect, authorize('admin','global_admin'), async (req,res)=>{
  try {
    const body = req.body || {};
    const items = Array.isArray(body.items)? body.items : [];
    const sponsored = items.filter(i=>i.reason==='sponsored').length;
    const capacity = body.capacity || { maxItems:12, minItems:0, sponsoredSessionCap:2 };
    const warnings=[]; const reasons=[];
    if(capacity.minItems && items.length < capacity.minItems) warnings.push('BELOW_MIN_ITEMS');
    if(capacity.maxItems && items.length > capacity.maxItems) warnings.push('OVER_MAX_ITEMS');
    if(sponsored > 0 && capacity.sponsoredSessionCap && sponsored > capacity.sponsoredSessionCap) {
      warnings.push('SPONSORED_OVER_PER_RAIL_CAP'); reasons.push('CAP_PER_RAIL');
    }
    // Site-wide cap heuristic (placeholder): if provided siteCap in body and sponsored exceed it
    if(typeof capacity.siteSponsoredCap === 'number' && capacity.siteSponsoredCap >=0 && sponsored > capacity.siteSponsoredCap){
      warnings.push('SPONSORED_OVER_SITE_CAP'); reasons.push('CAP_SITE');
    }
    // Optional targeting requirement (feature-branch enhancement): if flagged requireTargeting but missing targeting object
    const requireTargeting = body.requireTargeting === true || capacity.requireTargeting === true;
    if(requireTargeting && (!body.targeting || Object.keys(body.targeting).length === 0)) {
      warnings.push('MISSING_TARGETING');
    }
    // Allow callers to request failure semantics when warnings exist
    const failOnWarnings = body.failOnWarnings === true;
    const metricsAgg = await RailMetricsDaily.aggregate([{ $group:{ _id:null, imp:{ $sum:'$imp' }, clk:{ $sum:'$clk' }, atc:{ $sum:'$atc' } } }]);
    const global = metricsAgg[0] || { imp:0, clk:0, atc:0 };
    const globalCtr = global.imp? global.clk/global.imp : 0.02;
    const globalAtc = global.clk? global.atc/global.clk : 0.15;
    const expected = { ctrRange:[globalCtr*0.5, globalCtr*1.2], atcRateRange:[globalAtc*0.5, globalAtc*1.2] };
    const ok = failOnWarnings ? warnings.length === 0 : true;
    res.json({ ok, counts:{ total: items.length, sponsored, manual: items.length - sponsored }, capacity, expected, warnings, reasons });
  } catch(err){ res.status(400).json({ message:'Failed preflight', error: err.message }); }
});

module.exports = router;
