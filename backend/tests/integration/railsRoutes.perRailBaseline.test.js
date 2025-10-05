const request = require('supertest');
const app = require('../../server');
const Rail = require('../../models/Rail');
const RailMetricsDaily = require('../../models/RailMetricsDaily');

/*
  This test documents the current absence of per-rail baselines while
  setting up fixtures that will be reused once per-rail baselines are implemented.
*/

describe('Rails metrics per-rail baseline (placeholder)', () => {
  const railId = 'baseline_rail_A';
  beforeAll(async () => {
    // Normalize to match model pre-validate (railId stored in lowercase)
    const normalizedId = railId.toLowerCase();
    await Rail.deleteMany({ railId: normalizedId });
    await Rail.create({ railId: normalizedId, title: 'Baseline Rail A', status: 'published', placement: { page: 'home', slot: 'below_hero' }, type: 'dynamic', priority: 1 });
    // Seed 10 days of metrics with improving CTR so a per-rail percentile series would be meaningful
    const today = new Date();
    const docs = [];
    for (let i=0; i<10; i++) {
      const day = new Date(today.getTime() - i*86400000);
      const date = day.toISOString().slice(0,10);
      const imp = 100 + i*5; // slowly increasing traffic
      const clk = 5 + i;     // slightly increasing CTR
      const atc = Math.max(0, Math.round(clk*0.3));
      docs.push({ railId: normalizedId, date, imp, clk, atc, rev: clk*2, sessions: Math.round(imp*0.4) });
    }
    await RailMetricsDaily.deleteMany({ railId: normalizedId });
    await RailMetricsDaily.insertMany(docs);
  });

  it('returns global and per-rail baseline fields', async () => {
    const agent = request(app);
    // Deterministically create an admin user (roles injection allowed in non-prod)
    const email = `baseline_admin_${Date.now()}@example.com`;
    const reg = await agent.post('/api/auth/register').send({
      name: 'Baseline Admin',
      email,
      password: 'TestPass123!',
      roles: ['admin']
    });
    expect([200,201]).toContain(reg.status);
    const token = reg.body.token;
    expect(token).toBeTruthy();

    const res = await agent
      .get('/api/admin/rails/metrics?window=7&baseline=28')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Ensure our test rail is in response (ids are normalized to lowercase)
    const normalizedId = railId.toLowerCase();
    const found = res.body.rails.find(r => r.railId === normalizedId);
    expect(found).toBeTruthy();
    // Assert baseline structure is the existing global form
    expect(res.body.baseline).toHaveProperty('ctr.p30');
    expect(res.body.baseline).toHaveProperty('rpm.p80');
    // Metrics for the rail are present
    expect(found.metrics).toHaveProperty('ctr');
    // Per-rail baseline is not yet implemented; tolerate absence now,
    // but if present in the future, validate a couple of keys.
    if (found.perRailBaseline) {
      expect(found.perRailBaseline).toHaveProperty('ctr.p50');
      expect(found.perRailBaseline).toHaveProperty('rpm.p80');
    } else {
      expect(found.perRailBaseline).toBeUndefined();
    }
  });
});
