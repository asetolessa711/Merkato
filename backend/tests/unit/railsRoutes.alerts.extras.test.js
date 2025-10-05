const request = require('supertest');
const app = require('../../server');
const RailMetricsDaily = require('../../models/RailMetricsDaily');
const RailConfig = require('../../models/RailConfig');
const { registerTestUser } = require('../utils/testUserUtils');

function utcDateStr(d = new Date()) { return d.toISOString().slice(0,10); }

describe('railsRoutes alerts extras', () => {
  let admin;
  beforeAll(async () => {
    admin = await registerTestUser({ role: 'admin' });
    // Ensure default config exists with reasonable thresholds
    await RailConfig.findByIdAndUpdate('default', { $set: { alerts: { staleRollupDays: 2 } } }, { upsert: true });
  });

  beforeEach(async () => {
    await RailMetricsDaily.deleteMany({});
  });

  test('includes STALE_ROLLUPS when no metrics present', async () => {
    const res = await request(app)
      .get('/api/admin/rails/alerts')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const types = (res.body.alerts || []).map(a => a.type);
    expect(types).toContain('STALE_ROLLUPS');
  });

  test('includes CAP_SITE_HIGH when site-sponsored suppression spikes', async () => {
    const today = utcDateStr(new Date());
    await RailMetricsDaily.create({ railId: 'cap_test', date: today, imp: 0, clk: 0, rev: 0, sessions: 0, suppression: { siteSponsored: 2001 } });
    const res = await request(app)
      .get('/api/admin/rails/alerts')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const types = (res.body.alerts || []).map(a => a.type);
    expect(types).toContain('CAP_SITE_HIGH');
    // With fresh metrics present, stale rollups should not trigger
    expect(types).not.toContain('STALE_ROLLUPS');
  });
});
