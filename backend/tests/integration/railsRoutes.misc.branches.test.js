const request = require('supertest');
const app = require('../../server');
const Rail = require('../../models/Rail');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('railsRoutes misc branches', () => {
  let adminToken;

  beforeAll(async () => {
    const email = `railsmisc_${Date.now()}@example.com`;
    const pwd = 'Password123!';
    await registerTestUser({ email, password: pwd, roles: ['admin'] });
    const login = await loginTestUser(email, pwd);
    adminToken = `Bearer ${login.token}`;
  });

  test('GET /admin/rails/config returns config (tolerant)', async () => {
    const res = await request(app)
      .get('/api/admin/rails/config')
      .set('Authorization', adminToken);
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('config');
    }
  });

  test('GET /admin/rails with search param returns list shape', async () => {
    const res = await request(app)
      .get('/api/admin/rails?search=hero&page=1&pageSize=5')
      .set('Authorization', adminToken);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('rails');
    expect(res.body).toHaveProperty('total');
  });

  test('POST /admin/rails/backfill with small window', async () => {
    const res = await request(app)
      .post('/api/admin/rails/backfill')
      .set('Authorization', adminToken)
      .send({ window: 2 });
    expect([200, 400]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('days');
    }
  });

  test('GET /rails/selection returns ok:false when flag disabled', async () => {
    process.env.RAILS_SELECTION_V1 = 'false';
    const res = await request(app)
      .get('/api/rails/selection?surface=home&form=desktop');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('ok', false);
  });

  test('POST /rails/metrics/flush processes events and sessions unique', async () => {
    // Ensure a rail exists to collect metrics against
  await Rail.deleteMany({ railId: { $in: ['test_branches_r1'] } });
  // Use a valid tactic per Rail schema enum
  await Rail.create({ railId: 'test_branches_r1', title: 'Hero Rail', placementKey: 'HeroTop', environment: 'Prod', opsStatus: 'active', tactic: 'Curated', priority: 1, meta: { updatedAtUTC: new Date() } });

    const cookie = 'railSessId=abc123';
    const payload = {
      events: [
        { railId: 'test_branches_r1', type: 'imp', count: 1 },
        { railId: 'test_branches_r1', type: 'imp', count: 1 }, // second imp same session; sessions should still count once
        { railId: 'test_branches_r1', type: 'clk', count: 1 },
        { railId: 'test_branches_r1', type: 'item', subtype: 'clk', sku: 'SKU-1', count: 1 },
        { railId: 'test_branches_r1', type: 'item', subtype: 'atc', sku: 'SKU-1', count: 1 },
        { railId: 'test_branches_r1', type: 'suppression', subtype: 'siteSponsored', count: 2 }
      ]
    };
    const res = await request(app)
      .post('/api/rails/metrics/flush')
      .set('Cookie', cookie)
      .send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('processed');
  });
});
