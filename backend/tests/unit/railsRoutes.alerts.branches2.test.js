const request = require('supertest');
const app = require('../../server');
const RailDecisionLog = require('../../models/RailDecisionLog');
const RailMetricsDaily = require('../../models/RailMetricsDaily');
const RailConfig = require('../../models/RailConfig');
const { registerTestUser } = require('../utils/testUserUtils');

function utcDateStr(d = new Date()) { return d.toISOString().slice(0,10); }

describe('railsRoutes alerts more branches', () => {
  let admin;
  beforeAll(async () => {
    admin = await registerTestUser({ role: 'admin' });
  });

  beforeEach(async () => {
    await Promise.all([
      RailDecisionLog.deleteMany({}),
      RailMetricsDaily.deleteMany({}),
    ]);
  });

  test('flags EMPTY_SELECTION and SELECTION_SLOW from decision logs', async () => {
    await RailConfig.findByIdAndUpdate('default', { $set: { alerts: { selectionLatencyMs: 10 } } }, { upsert: true });
    const now = new Date();
    const tsRecent = new Date(now.getTime() - 5 * 60 * 1000);
    await RailDecisionLog.create([
      { ts: tsRecent, selection: [], durationMs: 5 },
      { ts: tsRecent, selection: [{ railId: 'r1' }], durationMs: 50 },
    ]);
    // Ensure metrics are not stale so STALE_ROLLUPS doesn't mask others
    await RailMetricsDaily.create({ railId: 'r1', date: utcDateStr(new Date()), imp: 0, clk: 0, rev: 0, sessions: 0 });
    const res = await request(app)
      .get('/api/admin/rails/alerts')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const types = (res.body.alerts || []).map(a => a.type);
    expect(types).toEqual(expect.arrayContaining(['EMPTY_SELECTION', 'SELECTION_SLOW']));
  });
});
