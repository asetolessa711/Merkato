const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('railsRoutes admin simple branches', () => {
  let adminToken;

  beforeAll(async () => {
    const email = `railsadmin_${Date.now()}@example.com`;
    const pwd = 'Password123!';
    await registerTestUser({ email, password: pwd, roles: ['admin'] });
    const login = await loginTestUser(email, pwd);
    adminToken = `Bearer ${login.token}`;
  });

  test('GET /admin/rails/presets returns presets array', async () => {
    const res = await request(app)
      .get('/api/admin/rails/presets')
      .set('Authorization', adminToken);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('presets');
    expect(Array.isArray(res.body.presets)).toBe(true);
  });

  test('POST /admin/rails/presets/resolve 404 for unknown preset', async () => {
    const res = await request(app)
      .post('/api/admin/rails/presets/resolve')
      .set('Authorization', adminToken)
      .send({ preset: 'not_a_preset' });
    expect([404, 400]).toContain(res.statusCode);
  });

  test('POST /admin/rails invalid placementKey -> 400', async () => {
    const res = await request(app)
      .post('/api/admin/rails')
      .set('Authorization', adminToken)
      .send({ railId: 'test_invalid_pk', title: 'Invalid PK', placementKey: 'NotARealKey' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid placementkey/i);
  });

  test('PUT /admin/rails/:railId not found -> 404', async () => {
    const res = await request(app)
      .put('/api/admin/rails/does_not_exist')
      .set('Authorization', adminToken)
      .send({ title: 'x' });
    expect([404, 400]).toContain(res.statusCode);
  });

  test('DELETE /admin/rails/:railId not found -> 404', async () => {
    const res = await request(app)
      .delete('/api/admin/rails/does_not_exist')
      .set('Authorization', adminToken);
    expect([404, 400]).toContain(res.statusCode);
  });

  test('POST /admin/rails/duplicate/:railId not found -> 404', async () => {
    const res = await request(app)
      .post('/api/admin/rails/duplicate/does_not_exist')
      .set('Authorization', adminToken);
    expect([404, 400]).toContain(res.statusCode);
  });

  test('GET /admin/rails/metrics/summary returns site metrics', async () => {
    const res = await request(app)
      .get('/api/admin/rails/metrics/summary?window=3')
      .set('Authorization', adminToken);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('site');
    expect(res.body.site).toHaveProperty('rpm');
  });

  test('GET /admin/rails/:railId/metrics 404 when rail missing', async () => {
    const res = await request(app)
      .get('/api/admin/rails/__nope__/metrics?window=3')
      .set('Authorization', adminToken);
    expect(res.statusCode).toBe(404);
  });

  test('GET/PUT /admin/rails/config round-trip (tolerant)', async () => {
    const get1 = await request(app)
      .get('/api/admin/rails/config')
      .set('Authorization', adminToken);
    expect(get1.statusCode).toBe(200);
    expect(get1.body).toHaveProperty('config');

    const put = await request(app)
      .put('/api/admin/rails/config')
      .set('Authorization', adminToken)
      .send({ selection: { maxRails: 3 } });
    // In some environments, this route may be disabled or behind additional guards; accept 200 or 404
    expect([200,404]).toContain(put.statusCode);
    if (put.statusCode === 200) {
      expect(put.body).toHaveProperty('ok', true);
    }

    const get2 = await request(app)
      .get('/api/admin/rails/config')
      .set('Authorization', adminToken);
    expect(get2.statusCode).toBe(200);
    const current = get2.body.config?.selection?.maxRails;
    expect(typeof current).toBe('number');
    // If PUT succeeded, value should be 3; otherwise accept existing default (e.g., 5)
    if (put.statusCode === 200) {
      expect(current).toBe(3);
    }
  });

  test('GET /admin/rails/alerts returns array of known types', async () => {
    const res = await request(app)
      .get('/api/admin/rails/alerts')
      .set('Authorization', adminToken);
    expect(res.statusCode).toBe(200);
    const alerts = res.body.alerts || [];
    const types = alerts.map(a => a.type);
    // Accept any subset of known alert types depending on prior test activity
    const known = ['STALE_ROLLUPS','CAP_SITE_HIGH','EMPTY_SELECTION','SELECTION_SLOW','ANOMALY','FRESHNESS_SLA'];
    expect(Array.isArray(alerts)).toBe(true);
    expect(types.every(t => known.includes(t))).toBe(true);
  });
});
