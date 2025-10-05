const request = require('supertest');
const path = require('path');
const fsp = require('fs/promises');
const mongoose = require('mongoose');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('Rails Routes @rails', () => {
  let adminToken;
  let customerToken;
  const DATA_DIR = path.join(__dirname, '..', '..', 'uploads');
  const AUDIT_FILE = path.join(DATA_DIR, 'rails-audit.log.jsonl');
  let backupAudit = null;

  beforeAll(async () => {
    const admin = await registerTestUser({
      email: `admin_${Date.now()}@example.com`,
      password: 'AdminPass123!',
      roles: ['admin'],
    });
    const adminLogin = await loginTestUser(admin.email, 'AdminPass123!');
    adminToken = `Bearer ${adminLogin.token}`;

    const customer = await registerTestUser({
      email: `cust_${Date.now()}@example.com`,
      password: 'CustPass123!',
      roles: ['customer'],
    });
    const customerLogin = await loginTestUser(customer.email, 'CustPass123!');
    customerToken = `Bearer ${customerLogin.token}`;

    await fsp.mkdir(DATA_DIR, { recursive: true });
    try { backupAudit = await fsp.readFile(AUDIT_FILE, 'utf8'); } catch(_) {}
  });

  afterAll(async () => {
    try { if(backupAudit !== null) await fsp.writeFile(AUDIT_FILE, backupAudit, 'utf8'); } catch(_) {}
    // Do not close mongoose here; globalTeardown will handle DB/socket shutdown once for the whole suite
  });

  let createdRailId = null;

  test('GET /api/admin/rails requires auth', async () => {
    const r1 = await request(app).get('/api/admin/rails');
    expect(r1.statusCode).toBe(401);
    const r2 = await request(app).get('/api/admin/rails').set('Authorization', customerToken);
    expect(r2.statusCode).toBe(403);
  });

  test('POST /api/admin/rails creates a rail', async () => {
    const res = await request(app)
      .post('/api/admin/rails')
      .set('Authorization', adminToken)
      .send({ title:'Test Rail', status:'draft', items:[{ sku:'SKU_A', reason:'manual' }] });
    expect(res.statusCode).toBe(201);
    expect(res.body.rail).toHaveProperty('railId');
    createdRailId = res.body.rail.railId;
  });

  test('PUT /api/admin/rails/:railId updates rail & audit logs', async () => {
    const res = await request(app)
      .put(`/api/admin/rails/${createdRailId}`)
      .set('Authorization', adminToken)
      .send({ status:'published', priority:5 });
    expect(res.statusCode).toBe(200);
    expect(res.body.rail.status).toBe('published');
    expect(res.body.rail.priority).toBe(5);
  });

  test('POST duplicate creates a copy in draft', async () => {
    const res = await request(app)
      .post(`/api/admin/rails/duplicate/${createdRailId}`)
      .set('Authorization', adminToken)
      .send();
    expect(res.statusCode).toBe(201);
    expect(res.body.rail.status).toBe('draft');
    expect(res.body.rail.title).toMatch(/Copy/);
  });

  test('Metrics flush + aggregation', async () => {
    // Flush some events for metrics
    const flush = await request(app)
      .post('/api/rails/metrics/flush')
      .send({ events:[
        { railId: createdRailId, type:'imp', count:10 },
        { railId: createdRailId, type:'clk', count:3 },
        { railId: createdRailId, type:'atc', count:2, rev: 40 },
        { railId: createdRailId, type:'imp', count:5 }
      ]});
    expect(flush.statusCode).toBe(200);
    expect(flush.body.processed).toBe(4);

    // Audit should contain metrics_flush
    let auditRaw = '';
    try { auditRaw = await fsp.readFile(AUDIT_FILE,'utf8'); } catch(_){ }
    const auditLines = auditRaw.trim().split(/\n+/).filter(Boolean);
    const hasFlush = auditLines.some(l=>{ try { return JSON.parse(l).action === 'metrics_flush'; } catch(_) { return false; } });
    expect(hasFlush).toBe(true);

    const metrics = await request(app)
      .get('/api/admin/rails/metrics?window=7&baseline=28&distinct=none')
      .set('Authorization', adminToken);
    expect(metrics.statusCode).toBe(200);
    const entry = metrics.body.rails.find(r=>r.railId===createdRailId);
    expect(entry).toBeTruthy();
    expect(entry.metrics.imp).toBeGreaterThanOrEqual(15);
    expect(entry.metrics.clk).toBe(3);
    expect(entry.metrics.atc).toBe(2);
    expect(entry.metrics.rev).toBe(40);
    expect(entry.metrics.ctr).toBeCloseTo(3/15, 5);
    expect(entry.metrics.atcRate).toBeCloseTo(2/3, 5);
    expect(entry.recommendation).toBeDefined();
    expect(Array.isArray(entry.reasons)).toBe(true);
  });

  test('Session uniqueness counts one session per rail per sessionId per day', async () => {
    // Create a fresh rail
    const resCreate = await request(app)
      .post('/api/admin/rails')
      .set('Authorization', adminToken)
      .send({ title:'Session Rail', status:'published', items:[] });
    expect(resCreate.statusCode).toBe(201);
    const sRailId = resCreate.body.rail.railId;

    // First flush with an impression -> should set cookie and count session
    const flush1 = await request(app)
      .post('/api/rails/metrics/flush')
      .send({ events:[ { railId: sRailId, type:'imp', count:1 } ]});
    expect(flush1.statusCode).toBe(200);
    const cookie = flush1.headers['set-cookie'];
    expect(cookie).toBeDefined();

    // Second flush with more impressions same cookie -> should NOT increment sessions again
    const flush2 = await request(app)
      .post('/api/rails/metrics/flush')
      .set('Cookie', cookie)
      .send({ events:[ { railId: sRailId, type:'imp', count:5 } ]});
    expect(flush2.statusCode).toBe(200);

    // Fetch metrics detail to verify sessions == 1
    const detail1 = await request(app)
      .get(`/api/admin/rails/${sRailId}/metrics?window=7`)
      .set('Authorization', adminToken);
    expect(detail1.statusCode).toBe(200);
    expect(detail1.body.metrics.sessions).toBe(1);
    expect(detail1.body.metrics.imp).toBe(6);

    // Third flush without cookie (new session) -> should count second session
    const flush3 = await request(app)
      .post('/api/rails/metrics/flush')
      .send({ events:[ { railId: sRailId, type:'imp', count:2 } ]});
    expect(flush3.statusCode).toBe(200);

    const detail2 = await request(app)
      .get(`/api/admin/rails/${sRailId}/metrics?window=7`)
      .set('Authorization', adminToken);
    expect(detail2.statusCode).toBe(200);
    expect(detail2.body.metrics.sessions).toBe(2);
    expect(detail2.body.metrics.imp).toBe(8);
  });

  test('Metrics summary and per-rail metrics include suppression + reasons', async () => {
    // Create a new rail to isolate suppression stats
    const createRes = await request(app)
      .post('/api/admin/rails')
      .set('Authorization', adminToken)
      .send({ title:'Supp Rail', status:'published', items:[{ sku:'SKU_SUP', reason:'manual' }] });
    expect(createRes.statusCode).toBe(201);
    const suppRailId = createRes.body.rail.railId;

    // Flush events including suppression types
    const flush2 = await request(app)
      .post('/api/rails/metrics/flush')
      .send({ events:[
        { railId: suppRailId, type:'imp', count:4 },
        { railId: suppRailId, type:'clk', count:1 },
        { railId: suppRailId, type:'suppression', subtype:'sponsored', count:2 },
        { railId: suppRailId, type:'suppression', subtype:'capacityTrim', count:1 },
        { railId: suppRailId, type:'suppression', subtype:'siteSponsored', count:3 }
      ]});
    expect(flush2.statusCode).toBe(200);

    // Site summary
    const summary = await request(app)
      .get('/api/admin/rails/metrics/summary?window=7')
      .set('Authorization', adminToken);
    expect(summary.statusCode).toBe(200);
    expect(summary.body.site).toBeDefined();
    // Ensure suppression fields exist
    expect(summary.body.site.suppression).toHaveProperty('sponsored');
    expect(summary.body.site.suppression).toHaveProperty('capacityTrim');
    expect(summary.body.site.suppression).toHaveProperty('siteSponsored');

    // Per-rail metrics detail
    const detail = await request(app)
      .get(`/api/admin/rails/${suppRailId}/metrics?window=7`)
      .set('Authorization', adminToken);
    expect(detail.statusCode).toBe(200);
    expect(detail.body.metrics.suppression.sponsored).toBe(2);
    expect(detail.body.metrics.suppression.capacityTrim).toBe(1);
    expect(detail.body.metrics.suppression.siteSponsored).toBe(3);
    expect(detail.body.metrics.imp).toBe(4);
    expect(detail.body.metrics.clk).toBe(1);
  });

  test('Audit log returns recent entries', async () => {
    const res = await request(app)
      .get('/api/admin/rails/audit?limit=10')
      .set('Authorization', adminToken);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBeGreaterThan(0);
    // Expect at least one with action create or update
    const actions = res.body.entries.map(e=>e.action);
    expect(actions.some(a=>['create','update','duplicate'].includes(a))).toBe(true);
    expect(actions.includes('metrics_flush')).toBe(true);
  });

  test('Preflight returns expected ranges and warnings', async () => {
    const res = await request(app)
      .post('/api/admin/rails/preflight')
      .set('Authorization', adminToken)
      // Two sponsored items exceed sponsoredSessionCap=1
      .send({ items:[{ sku:'X1', reason:'manual' }, { sku:'X2', reason:'sponsored' }, { sku:'X3', reason:'sponsored' }], capacity:{ minItems:5, maxItems:10, sponsoredSessionCap:1 } });
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.warnings)).toBe(true);
    expect(res.body.warnings).toContain('BELOW_MIN_ITEMS');
    // Debug log to inspect warnings if expectation fails
    if(!res.body.warnings.includes('SPONSORED_OVER_PER_RAIL_CAP')){
      // eslint-disable-next-line no-console
      console.log('Preflight debug (per-rail cap test):', res.body);
    }
    expect(res.body.warnings).toContain('SPONSORED_OVER_PER_RAIL_CAP');
    expect(Array.isArray(res.body.expected.ctrRange)).toBe(true);
    expect(res.body.expected.ctrRange.length).toBe(2);
    // New reasons array should reflect per-rail cap
    expect(Array.isArray(res.body.reasons)).toBe(true);
    expect(res.body.reasons).toContain('CAP_PER_RAIL');
  });

  test('Preflight site cap only produces CAP_SITE reason', async () => {
    const res = await request(app)
      .post('/api/admin/rails/preflight')
      .set('Authorization', adminToken)
      // One sponsored item exceeds siteSponsoredCap=0 but within per-rail cap of 2
      .send({ items:[{ sku:'S1', reason:'sponsored' }], capacity:{ maxItems:10, sponsoredSessionCap:2, siteSponsoredCap:0 } });
    expect(res.statusCode).toBe(200);
    expect(res.body.warnings).toContain('SPONSORED_OVER_SITE_CAP');
    expect(res.body.warnings).not.toContain('SPONSORED_OVER_PER_RAIL_CAP');
    expect(res.body.reasons).toContain('CAP_SITE');
    expect(res.body.reasons).not.toContain('CAP_PER_RAIL');
  });

  test('Preflight failOnWarnings returns ok=false with multiple warnings including missing targeting', async () => {
    const res = await request(app)
      .post('/api/admin/rails/preflight')
      .set('Authorization', adminToken)
      .send({
        items: Array.from({ length: 15 }).map((_,i)=> ({ sku:'B'+i, reason: i<5? 'sponsored':'manual' })),
        capacity: { minItems: 20, maxItems: 10, sponsoredSessionCap: 3, siteSponsoredCap: 2, requireTargeting: true },
        failOnWarnings: true,
        requireTargeting: true,
        targeting: null
      });
    expect(res.statusCode).toBe(200);
    // Should collect multiple warnings
    const w = res.body.warnings;
    expect(w).toContain('BELOW_MIN_ITEMS');
    expect(w).toContain('OVER_MAX_ITEMS');
    expect(w).toContain('SPONSORED_OVER_PER_RAIL_CAP');
    expect(w).toContain('SPONSORED_OVER_SITE_CAP');
    expect(w).toContain('MISSING_TARGETING');
    expect(res.body.ok).toBe(false);
  });

  test('Aggregation recommendations reflect granular sponsored cap reasons', async () => {
    // Create three rails to trigger each recommendation variant
    const rPer = await request(app)
      .post('/api/admin/rails')
      .set('Authorization', adminToken)
      .send({ title:'Cap Per Rail', status:'published', items:[] });
    const rSite = await request(app)
      .post('/api/admin/rails')
      .set('Authorization', adminToken)
      .send({ title:'Cap Site Rail', status:'published', items:[] });
    const rBoth = await request(app)
      .post('/api/admin/rails')
      .set('Authorization', adminToken)
      .send({ title:'Cap Both Rail', status:'published', items:[] });
    expect(rPer.statusCode).toBe(201); expect(rSite.statusCode).toBe(201); expect(rBoth.statusCode).toBe(201);
    const perId = rPer.body.rail.railId;
    const siteId = rSite.body.rail.railId;
    const bothId = rBoth.body.rail.railId;

    // Flush suppression events (no need for impressions to tag CAP reasons)
    const flush = await request(app)
      .post('/api/rails/metrics/flush')
      .send({ events:[
        { railId: perId, type:'suppression', subtype:'sponsored', count:2 },
        { railId: siteId, type:'suppression', subtype:'siteSponsored', count:2 },
        { railId: bothId, type:'suppression', subtype:'sponsored', count:1 },
        { railId: bothId, type:'suppression', subtype:'siteSponsored', count:1 }
      ]});
    expect(flush.statusCode).toBe(200);

    const metrics = await request(app)
      .get('/api/admin/rails/metrics?window=7&baseline=28&distinct=none')
      .set('Authorization', adminToken);
    expect(metrics.statusCode).toBe(200);
    const byId = {};
    metrics.body.rails.forEach(r=>{ byId[r.railId]=r; });
    expect(byId[perId].recommendation).toBe('SPONSORED_CAP_PER_RAIL');
    expect(byId[perId].reasons).toContain('CAP_PER_RAIL');
    expect(byId[perId].reasons).not.toContain('CAP_SITE');
    expect(byId[siteId].recommendation).toBe('SPONSORED_CAP_SITE');
    expect(byId[siteId].reasons).toContain('CAP_SITE');
    expect(byId[siteId].reasons).not.toContain('CAP_PER_RAIL');
    expect(byId[bothId].recommendation).toBe('SPONSORED_CAP_MULTI');
    expect(byId[bothId].reasons).toContain('CAP_PER_RAIL');
    expect(byId[bothId].reasons).toContain('CAP_SITE');
  });

  test('Metrics aggregation exposes baseline percentile bands', async () => {
    const resAgg = await request(app)
      .get('/api/admin/rails/metrics?window=7&baseline=28&distinct=none')
      .set('Authorization', adminToken);
    expect(resAgg.statusCode).toBe(200);
    const base = resAgg.body.baseline;
    expect(base).toBeDefined();
    expect(base.ctr).toHaveProperty('p30');
    expect(base.ctr).toHaveProperty('p50');
    expect(base.ctr).toHaveProperty('p70');
    expect(base.atc).toHaveProperty('p30');
    expect(base.atc).toHaveProperty('p50');
    expect(base.atc).toHaveProperty('p70');
    expect(base.rpm).toHaveProperty('p80');
    // Values are numbers (may be 0 early on but still numeric)
    expect(typeof base.ctr.p30).toBe('number');
    expect(typeof base.atc.p70).toBe('number');
    expect(typeof base.rpm.p80).toBe('number');
  });

  test('Audit log reflects zero incremental sessions on second flush (sessions delta stays same)', async () => {
    // Create rail and perform two flushes with same cookie
    const resCreate = await request(app)
      .post('/api/admin/rails')
      .set('Authorization', adminToken)
      .send({ title:'Audit Session Rail', status:'published', items:[] });
    expect(resCreate.statusCode).toBe(201);
    const aRailId = resCreate.body.rail.railId;
    const first = await request(app)
      .post('/api/rails/metrics/flush')
      .send({ events:[ { railId: aRailId, type:'imp', count:1 } ]});
    expect(first.statusCode).toBe(200);
    const cookie = first.headers['set-cookie'];
    // Extract the rail session id so we can precisely attribute audit log lines to THIS test's flushes only
    const sidMatch = Array.isArray(cookie) ? /railSessId=([^;]+)/.exec(cookie[0]||'') : /railSessId=([^;]+)/.exec(cookie||'');
    const sid = sidMatch ? sidMatch[1] : null;
    const second = await request(app)
      .post('/api/rails/metrics/flush')
      .set('Cookie', cookie)
      .send({ events:[ { railId: aRailId, type:'imp', count:3 } ]});
    expect(second.statusCode).toBe(200);
    // Read audit tail and ensure only one sessions increment was logged across both flushes for this rail (best-effort heuristic)
    const auditRaw = await fsp.readFile(AUDIT_FILE,'utf8').catch(()=> '');
    const lines = auditRaw.trim().split(/\n+/).filter(l=>/metrics_flush/.test(l)).slice(-15);
    // Only consider flush records where railId matches our rail or single-rail flush context
    let incrementEvents = 0;
    lines.forEach(l=>{ try { const j=JSON.parse(l); if(j.action==='metrics_flush'){ const diff=j.diff||{}; if(diff.sessionId===sid && diff.rails===1 && diff.sessions===1){ incrementEvents += 1; } } } catch(_){ } });
    // Exactly one flush should have a sessions increment of 1 (the first). Second flush with same cookie should not increment.
    expect(incrementEvents).toBe(1);
  });

  test('Suppression combination triggers SUPPRESSION_HIGH alongside cap reasons', async () => {
    const createRes = await request(app)
      .post('/api/admin/rails')
      .set('Authorization', adminToken)
      .send({ title:'Supp Combo Rail', status:'published', items:[] });
    expect(createRes.statusCode).toBe(201);
    const railId = createRes.body.rail.railId;
    // Low impressions but high suppression counts
    const flushRes = await request(app)
      .post('/api/rails/metrics/flush')
      .send({ events:[
        { railId, type:'imp', count:2 },
        { railId, type:'suppression', subtype:'sponsored', count:3 },
        { railId, type:'suppression', subtype:'siteSponsored', count:2 },
        { railId, type:'suppression', subtype:'capacityTrim', count:1 },
        { railId, type:'suppression', subtype:'capacityRail', count:1 }
      ]});
    expect(flushRes.statusCode).toBe(200);
    const metrics = await request(app)
      .get('/api/admin/rails/metrics?window=7&baseline=28&distinct=none')
      .set('Authorization', adminToken);
    expect(metrics.statusCode).toBe(200);
    const entry = metrics.body.rails.find(r=>r.railId===railId);
    expect(entry).toBeTruthy();
    expect(entry.reasons).toContain('CAP_PER_RAIL');
    expect(entry.reasons).toContain('CAP_SITE');
    expect(entry.reasons).toContain('SUPPRESSION_HIGH');
    expect(entry.recommendation).toBe('SPONSORED_CAP_MULTI');
  });

  test('DELETE /api/admin/rails/:railId removes rail', async () => {
    const del = await request(app)
      .delete(`/api/admin/rails/${createdRailId}`)
      .set('Authorization', adminToken);
    expect(del.statusCode).toBe(200);
    const list = await request(app)
      .get('/api/admin/rails')
      .set('Authorization', adminToken);
    // original rail removed (copy still exists)
    expect(list.body.rails.some(r=>r.railId===createdRailId)).toBe(false);
  });
});
