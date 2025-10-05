// src/utils/railsStore.js
// Local client-side storage & resolver for Curated Rails (Phase 1 merchandising)
// Mirrors patterns used in heroBanners.js but simplified for MVP.

const LS_KEY = 'merkato-rails:v1';
const METRICS_KEY = 'merkato-rails-metrics:v1';
const DAILY_KEY = 'merkato-rails-metrics-daily:v1'; // per-day buckets for time range aggregation

// ---------- Persistence ----------
export function loadRails() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const obj = JSON.parse(raw || '{}');
    return obj && typeof obj === 'object' ? obj : {};
  } catch (_) { return {}; }
}

export function saveRails(railsObj) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(railsObj && typeof railsObj === 'object' ? railsObj : {}));
    return true;
  } catch (_) { return false; }
}

export function clearRails() { try { localStorage.removeItem(LS_KEY); } catch (_) {} }

// Shape: rails[railId] = { id, title, status, placement:{page,slot}, type, items:[{sku, reason?, weight?}], targeting, schedule, priority, metrics, createdAt, updatedAt }

export function newRailTemplate(partial = {}) {
  return {
    id: `rail_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    title: 'New Rail',
    status: 'draft', // 'draft' | 'published'
    placement: { page: 'home', slot: 'below_hero' },
    type: 'featured', // featured | new | best_sellers | trending | staff_picks | sponsored_mix
    items: [], // SKUs only for MVP; each item = { sku, reason?:'manual'|'sponsored', weight?:number }
    // Capacity & sponsored mix configuration (Phase 1 guardrails)
    // maxItems: hard cap on items rendered
    // minItems: minimum items required to show rail (else rail suppressed)
    // sponsoredEvery: if >0 and rail.type === 'sponsored_mix', insert a sponsored item every N slots (future use)
    // sponsoredSessionCap: max sponsored impressions per session for this rail
  // Set minItems default to 0 so newly created (empty) rails are still visible in admin & tests.
  capacity: { maxItems: 12, minItems: 0, sponsoredEvery: 0, sponsoredSessionCap: 2 },
    targeting: { categories: [], roles: ['all'], regions: [], languages: ['all'] },
    schedule: { startAt: null, endAt: null },
    priority: 0,
    metrics: { impressions: 0, clicks: 0, atc: 0, revenue: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

// Upsert a rail. rails are stored as keyed object for quick lookup.
export function upsertRail(rail) {
  if (!rail || !rail.id) return loadRails();
  const all = loadRails();
  const existing = all[rail.id];
  all[rail.id] = { ...(existing || {}), ...rail, updatedAt: new Date().toISOString() };
  saveRails(all);
  return all;
}

export function deleteRail(id) {
  const all = loadRails();
  if (all[id]) { delete all[id]; saveRails(all); }
  return all;
}

// ---------- Metrics ----------
export function getRailMetricsStore() {
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    const m = JSON.parse(raw || '{}');
    return m && typeof m === 'object' ? m : {};
  } catch (_) { return {}; }
}

function saveMetrics(m) { try { localStorage.setItem(METRICS_KEY, JSON.stringify(m)); } catch (_) {} }
export function resetRailMetrics() { try { localStorage.removeItem(METRICS_KEY); } catch (_) {} }
export function resetRailDailyMetrics() { try { localStorage.removeItem(DAILY_KEY); } catch (_) {} }
// Backward-compatible: broaden resetRailMetrics to also clear daily if caller expects full reset
export function resetAllRailMetrics() { resetRailMetrics(); resetRailDailyMetrics(); }

function bumpMetric(key, by = 1) {
  try {
    // Aggregate store (all time)
    const m = getRailMetricsStore();
    m[key] = (Number(m[key]) || 0) + by;
    saveMetrics(m);
    // Daily buckets
    const day = (new Date()).toISOString().slice(0,10); // YYYY-MM-DD
    let daily = {};
    try { daily = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}') || {}; } catch(_) {}
    if(!daily[day]) daily[day] = {};
    daily[day][key] = (Number(daily[day][key]) || 0) + by;
    // Trim to last 40 days to avoid unbounded growth
    const days = Object.keys(daily).sort().reverse();
    const keep = days.slice(0, 40);
    const trimmed = keep.reduce((acc,d)=>{ acc[d]=daily[d]; return acc; }, {});
    localStorage.setItem(DAILY_KEY, JSON.stringify(trimmed));
  } catch (_) {}
}

export function recordRailImpression(railId) {
  if (!railId) return;
  bumpMetric(`imp.${railId}`);
  // Session tracking (one session impression per rail per browser tab session)
  try {
    const S_KEY = 'merkato-rails-session-seen';
    const raw = sessionStorage.getItem(S_KEY) || '[]';
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error('bad');
    if (!arr.includes(railId)) {
      arr.push(railId);
      sessionStorage.setItem(S_KEY, JSON.stringify(arr));
      bumpMetric(`sess.${railId}`);
    }
  } catch (_) {
    // fallback: still bump session once if error
    bumpMetric(`sess.${railId}`);
  }
}
export function recordRailClick(railId) { if (railId) bumpMetric(`clk.${railId}`); }
export function recordRailItemClick(railId, sku) { if (railId && sku) bumpMetric(`clkItem.${railId}.${sku}`); }
export function recordRailAtc(railId, sku, price=0) { if (railId) { bumpMetric(`atc.${railId}`); if (sku) bumpMetric(`atcItem.${railId}.${sku}`); if (price) bumpMetric(`rev.${railId}`, Number(price)); } }

// -------- Aggregation & Range Utilities --------
function loadDaily() {
  try { const raw = localStorage.getItem(DAILY_KEY); const v = JSON.parse(raw||'{}'); return v && typeof v === 'object' ? v : {}; } catch(_) { return {}; }
}

// Aggregate metrics for a rail within the past N days (days>=1). Includes derived rates.
export function getRailTimeRangeMetrics(railId, days = 7) {
  const rangeDays = Math.max(1, Number(days)||1);
  const cutoff = Date.now() - rangeDays*24*60*60*1000;
  const daily = loadDaily();
  const base = { imp:0, clk:0, atc:0, rev:0, sessions:0 };
  const itemClk = {}; const itemAtc = {};
  Object.entries(daily).forEach(([day, bucket]) => {
    const dayTs = Date.parse(day + 'T00:00:00Z');
    if (isNaN(dayTs) || dayTs < cutoff) return;
    Object.entries(bucket || {}).forEach(([k,vRaw]) => {
      const v = Number(vRaw)||0;
      if (k === `imp.${railId}`) base.imp += v;
      else if (k === `clk.${railId}`) base.clk += v;
      else if (k === `atc.${railId}`) base.atc += v;
      else if (k === `rev.${railId}`) base.rev += v;
      else if (k === `sess.${railId}`) base.sessions += v;
      else if (k.startsWith(`clkItem.${railId}.`)) {
        const sku = k.split('.').slice(2).join('.');
        itemClk[sku] = (itemClk[sku]||0)+v;
      } else if (k.startsWith(`atcItem.${railId}.`)) {
        const sku = k.split('.').slice(2).join('.');
        itemAtc[sku] = (itemAtc[sku]||0)+v;
      }
    });
  });
  // Fallback to all-time if window empty (gives marketer something) – optional
  if (base.imp===0 && base.clk===0 && base.atc===0 && base.rev===0) {
    const all = getRailMetricsStore();
    base.imp = Number(all[`imp.${railId}`]||0);
    base.clk = Number(all[`clk.${railId}`]||0);
    base.atc = Number(all[`atc.${railId}`]||0);
    base.rev = Number(all[`rev.${railId}`]||0);
    base.sessions = Number(all[`sess.${railId}`]||0);
    // item-level (all-time)
    Object.keys(all).forEach(k=>{
      if (k.startsWith(`clkItem.${railId}.`)) { const sku=k.split('.').slice(2).join('.'); itemClk[sku]=(itemClk[sku]||0)+Number(all[k]||0); }
      if (k.startsWith(`atcItem.${railId}.`)) { const sku=k.split('.').slice(2).join('.'); itemAtc[sku]=(itemAtc[sku]||0)+Number(all[k]||0); }
    });
  }
  const ctr = base.imp ? base.clk / base.imp : 0;
  const atcRate = base.clk ? base.atc / base.clk : 0;
  const revPerImp = base.imp ? base.rev / base.imp : 0;
  const revPerSession = base.sessions ? base.rev / base.sessions : 0;
  return {
    ...base,
    ctr,
    atcRate,
    revPerImp,
    revPerSession,
    clkItems: itemClk,
    atcItems: itemAtc,
  };
}

export function exportRailsCsv(railsMap, days=7) {
  const header = ['railId','title','days','impressions','clicks','ctr','atc','atcRate','revenue','revPerImp','sessions','revPerSession'];
  const rows = [header.join(',')];
  Object.values(railsMap||{}).forEach(r => {
    const m = getRailTimeRangeMetrics(r.id, days);
    rows.push([
      r.id,
      JSON.stringify(r.title||''),
      days,
      m.imp,
      m.clk,
      m.ctr.toFixed(4),
      m.atc,
      m.atcRate.toFixed(4),
      m.rev.toFixed(2),
      m.revPerImp.toFixed(4),
      m.sessions,
      m.revPerSession.toFixed(4),
    ].join(','));
  });
  return rows.join('\n');
}

// ---------- Suppression & Baseline Utilities ----------
export function getSponsoredSuppressionTotals(days=7) {
  const rangeDays = Math.max(1, Number(days)||1);
  const cutoff = Date.now() - rangeDays*24*60*60*1000;
  const daily = loadDaily();
  let site=0; const perRail={};
  Object.entries(daily).forEach(([day,bucket])=>{
    const dayTs = Date.parse(day + 'T00:00:00Z');
    if (isNaN(dayTs) || dayTs < cutoff) return;
    Object.entries(bucket||{}).forEach(([k,vRaw])=>{
      const v = Number(vRaw)||0;
      if(k==='suppress.sponsored.site') site += v;
      else if(k.startsWith('suppress.sponsored.')) {
        const id = k.split('.').slice(2).join('.');
        perRail[id] = (perRail[id]||0)+v;
      }
    });
  });
  return { site, perRail };
}

export function getRailBaselineMedian(days=7) {
  // Compute medians of CTR and ATC rate across rails for given window
  const result = { ctrMedian:0, atcRateMedian:0 };
  const rails = Object.values(loadRails());
  const ctrs=[]; const atcs=[];
  rails.forEach(r=>{
    const m = getRailTimeRangeMetrics(r.id, days);
    if(m.imp>0) ctrs.push(m.ctr);
    if(m.clk>0) atcs.push(m.atcRate);
  });
  function median(arr){ if(!arr.length) return 0; const s=arr.slice().sort((a,b)=>a-b); const mid=Math.floor(s.length/2); return s.length%2? s[mid] : (s[mid-1]+s[mid])/2; }
  result.ctrMedian = median(ctrs);
  result.atcRateMedian = median(atcs);
  return result;
}

// ---------- Resolver ----------
function normalizeStr(x){ return String(x||'').trim().toLowerCase(); }
function nowTs(){ return Date.now(); }
function windowActive(sched){ if(!sched) return true; const n=nowTs(); const s=sched.startAt?Number(new Date(sched.startAt).getTime()):null; const e=sched.endAt?Number(new Date(sched.endAt).getTime()):null; if(s && n < s) return false; if(e && n > e) return false; return true; }

function roleOk(roles, role){ if(!Array.isArray(roles) || roles.length===0) return true; const r=normalizeStr(role||'guest'); return roles.map(normalizeStr).some(v=>v==='all'||v===r); }
function langOk(langs, lang){ if(!Array.isArray(langs) || langs.length===0) return true; const cur=normalizeStr(lang||'en'); return langs.map(normalizeStr).some(v=>v==='all'||cur.startsWith(v)); }
function regionOk(regions, region){ if(!Array.isArray(regions) || regions.length===0) return true; const r=String(region||'US').toUpperCase(); return regions.map(x=>String(x).toUpperCase()).includes(r); }

function getUserContext(){ let role='guest', lang='en', region='US'; try { const user=JSON.parse(localStorage.getItem('user')||'null'); if(user&&user.role) role=user.role; } catch(_){ } try { const preferred=localStorage.getItem('lang')||navigator.language||'en-US'; lang=String(preferred).toLowerCase(); } catch(_){ } try { const loc=(navigator.language||'en-US').split('-')[1]; if(loc) region=loc.toUpperCase(); } catch(_){ } return { role, lang, region }; }

export function resolveRails({ page='home', slot, role, lang, region, includeDrafts=false }={}) {
  const ctx = { ...getUserContext(), ...(role?{role}:{}), ...(lang?{lang}:{}), ...(region?{region}:{}) };
  const all = loadRails();
  const arr = Object.values(all);
  const eligible = arr
    .filter(r => r && (includeDrafts ? true : r.status === 'published'))
    .filter(r => r.placement && r.placement.page === page)
    .filter(r => slot ? (r.placement.slot === slot) : true)
    .filter(r => windowActive(r.schedule))
    .filter(r => roleOk(r.targeting?.roles, ctx.role))
    .filter(r => langOk(r.targeting?.languages, ctx.lang))
    .filter(r => regionOk(r.targeting?.regions, ctx.region));

  eligible.sort((a,b)=>{
    const pa = Number(a.priority||0); const pb = Number(b.priority||0);
    if (pa !== pb) return pa - pb;
    const ta = Number(new Date(a.createdAt||0).getTime());
    const tb = Number(new Date(b.createdAt||0).getTime());
    return tb - ta; // newest first on tie
  });

  // Slot capacity heuristic (MVP): below_hero:1, mid_1:1, mid_2:1 by default
  const capMap = { below_hero: 1, mid_1: 1, mid_2: 1 };
  const cap = slot && capMap[slot] ? capMap[slot] : null;
  const limited = cap ? eligible.slice(0, cap) : eligible;

  // Record resolution metrics
  bumpMetric('resolve.count');
  bumpMetric(`resolve.page.${page}`);
  limited.forEach(r => { bumpMetric(`resolve.rail.${r.id}`); });

  // Guardrails Phase 1: enforce capacity & sponsored caps; exclude sponsored on cart/checkout pages
  const SPONSORED_SITE_CAP = 5; // session-level
  // Session counters
  let sessionSponsored = 0;
  try {
    sessionSponsored = Number(sessionStorage.getItem('merkato-sponsored-count')||'0')||0;
  } catch(_) {}

  const processed = limited.map(r => {
    const capacity = r.capacity || { maxItems:12, minItems:0, sponsoredEvery:0, sponsoredSessionCap:2 };
    let items = Array.isArray(r.items) ? [...r.items] : [];
    // Filter out sponsored items entirely on restricted pages
    const restrictedPage = ['cart','checkout'].includes(page);
    if (restrictedPage) items = items.filter(it=>it.reason !== 'sponsored');

    // Apply session caps for sponsored items
    let sponsoredInRail = 0;
    const perRailCap = capacity.sponsoredSessionCap || 2;
    items = items.filter(it => {
      if (it.reason === 'sponsored') {
        if (sessionSponsored >= SPONSORED_SITE_CAP) { bumpMetric(`suppress.sponsored.site`); return false; }
        if (sponsoredInRail >= perRailCap) { bumpMetric(`suppress.sponsored.${r.id}`); return false; }
        sponsoredInRail += 1; sessionSponsored += 1; return true;
      }
      return true;
    });
    try { sessionStorage.setItem('merkato-sponsored-count', String(sessionSponsored)); } catch(_) {}

    // Basic capacity trimming
    if (capacity.maxItems && items.length > capacity.maxItems) {
      bumpMetric(`suppress.capacity.trim.${r.id}`);
      items = items.slice(0, capacity.maxItems);
    }
    // Suppress entire rail if below minItems
    if (capacity.minItems && items.length < capacity.minItems) {
      bumpMetric(`suppress.capacity.rail.${r.id}`);
      return null; // filtered later
    }
    return { ...r, items };
  }).filter(Boolean);

  return processed;
}

// Utility to quickly duplicate a rail
export function duplicateRail(id) {
  const all = loadRails();
  const r = all[id];
  if(!r) return all;
  const copy = { ...r, id: `rail_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, title: r.title + ' (Copy)', status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  all[copy.id] = copy;
  saveRails(all);
  return all;
}

// Parse raw SKU list input (comma or newline separated)
export function parseSkuList(input){
  if(!input) return [];
  return String(input)
    .split(/[,\n]/g)
    .map(s=>s.trim())
    .filter(Boolean)
    .filter((v,i,arr)=>arr.indexOf(v)===i);
}

// ---------------- New Backend Integration (Phase 2) ----------------
// Event queue shape: { railId, type: 'imp'|'clk'|'atc'|'suppression'|'item', subtype?, sku?, count?, rev? }
// We batch and POST to /api/rails/metrics/flush { events: [...] }

let _pendingEvents = [];
let _flushInFlight = null;
let _lastFlushTs = 0;
let _flushTimer = null;
let _initBound = false;
let _backoff = 0; // ms

const FLUSH_ENDPOINT = '/api/rails/metrics/flush';
const MIN_INTERVAL = 4000; // ms between background flush attempts
const MAX_BATCH = 80; // safety cap
const MAX_BACKOFF = 60000; // 60s

function now(){ return Date.now(); }

function enqueueEvent(ev){
  if(!ev || !ev.railId || !ev.type) return;
  _pendingEvents.push(ev);
  if(_pendingEvents.length >= MAX_BATCH) flushRailMetrics();
}

async function postJson(url, body){
  const headers = { 'Content-Type':'application/json' };
  // Allow existing auth token if stored
  try { const auth = localStorage.getItem('token'); if(auth) headers.Authorization = `Bearer ${auth}`; } catch(_){ }
  const res = await fetch(url, { method:'POST', headers, body: JSON.stringify(body) });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(()=>({ ok:true }));
}

export async function flushRailMetrics(force=false){
  if(_flushInFlight) return _flushInFlight;
  if(!force && (now() - _lastFlushTs < MIN_INTERVAL) && _pendingEvents.length < 10) return; // throttle small trickle
  if(_pendingEvents.length === 0) return;
  const events = _pendingEvents.splice(0, _pendingEvents.length);
  _flushInFlight = (async () => {
    try {
      await postJson(FLUSH_ENDPOINT, { events });
      _lastFlushTs = now();
      _backoff = 0;
    } catch(err){
      // Re-queue events (prepend) and apply backoff
      _pendingEvents = events.concat(_pendingEvents);
      _backoff = _backoff ? Math.min(_backoff * 2, MAX_BACKOFF) : 2000;
      // schedule retry
      scheduleFlush(_backoff);
    } finally {
      _flushInFlight = null;
    }
  })();
  return _flushInFlight;
}

function scheduleFlush(delay=MIN_INTERVAL){
  if(_flushTimer) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(()=>{ flushRailMetrics(); }, delay);
}

function bindLifecycle(){
  if(_initBound) return; _initBound = true;
  // Periodic background flush
  scheduleFlush(MIN_INTERVAL);
  // Visibility change flush on hide
  try { document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden') flushRailMetrics(true); }); } catch(_){ }
  // Page unload best-effort sync using sendBeacon (fallback to sync XHR)
  try {
    const handler = () => {
      if(_pendingEvents.length === 0) return;
      const payload = JSON.stringify({ events: _pendingEvents.slice(0, MAX_BATCH) });
      _pendingEvents = []; // drop (best effort)
      if(navigator.sendBeacon){
        const blob = new Blob([payload], { type:'application/json' });
        navigator.sendBeacon(FLUSH_ENDPOINT, blob);
      } else {
        // sync XHR fallback (blocking)
        const xhr = new XMLHttpRequest();
        xhr.open('POST', FLUSH_ENDPOINT, false);
        xhr.setRequestHeader('Content-Type','application/json');
        try { const auth = localStorage.getItem('token'); if(auth) xhr.setRequestHeader('Authorization', `Bearer ${auth}`); } catch(_){ }
        try { xhr.send(payload); } catch(_){ }
      }
    };
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);
  } catch(_){ }
}

// Public recording helpers that enqueue events AND keep local metrics for immediate UI reflection.
export function recordImp(railId){ if(!railId) return; recordRailImpression(railId); enqueueEvent({ railId, type:'imp', count:1 }); bindLifecycle(); }
export function recordClk(railId){ if(!railId) return; recordRailClick(railId); enqueueEvent({ railId, type:'clk', count:1 }); bindLifecycle(); }
export function recordAtc(railId, sku, price){ if(!railId) return; recordRailAtc(railId, sku, price); enqueueEvent({ railId, type:'atc', count:1, rev: price? Number(price)||0 : undefined }); bindLifecycle(); }
export function recordItemClk(railId, sku){ if(!railId || !sku) return; recordRailItemClick(railId, sku); enqueueEvent({ railId, type:'item', subtype:'clk', sku, count:1 }); bindLifecycle(); }
export function recordItemAtc(railId, sku, price){ if(!railId || !sku) return; recordRailAtc(railId, sku, price); enqueueEvent({ railId, type:'item', subtype:'atc', sku, count:1, rev: price? Number(price)||0 : undefined }); bindLifecycle(); }

// Optional suppression event logging (capacity / sponsored caps) for analytics parity.
export function recordSuppression(railId, subtype){ if(!railId) return; enqueueEvent({ railId, type:'suppression', subtype: subtype||'sponsored', count:1 }); bindLifecycle(); }

// Convenience accessor for queued length (for tests / debug UI)
export function getQueuedRailEventsCount(){ return _pendingEvents.length; }

// Allow tests to reset internal state
export function _resetRailEventQueueForTests(){ _pendingEvents = []; if(_flushTimer) clearTimeout(_flushTimer); _flushTimer=null; _flushInFlight=null; _backoff=0; _lastFlushTs=0; _initBound=false; }
