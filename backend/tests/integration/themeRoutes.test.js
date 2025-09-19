const request = require('supertest');
const path = require('path');
const fsp = require('fs/promises');
const mongoose = require('mongoose');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('Theme Routes @theme', () => {
  let adminToken;
  let customerToken;

  const DATA_DIR = path.join(__dirname, '..', '..', 'uploads');
  const THEME_FILE = path.join(DATA_DIR, 'theme.json');
  const AUDIT_FILE = path.join(DATA_DIR, 'theme-audit.log.jsonl');

  let backupTheme = null;
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
    try { backupTheme = await fsp.readFile(THEME_FILE, 'utf8'); } catch (_) {}
    try { backupAudit = await fsp.readFile(AUDIT_FILE, 'utf8'); } catch (_) {}
  });

  afterAll(async () => {
    try {
      if (backupTheme !== null) {
        await fsp.writeFile(THEME_FILE, backupTheme, 'utf8');
      }
    } catch (_) {}
    try {
      if (backupAudit !== null) {
        await fsp.writeFile(AUDIT_FILE, backupAudit, 'utf8');
      }
    } catch (_) {}

    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  describe('Public: GET /api/theme and /api/themes', () => {
    test('returns default active theme and themes list', async () => {
      const res1 = await request(app).get('/api/theme');
      expect(res1.statusCode).toBe(200);
      expect(res1.body).toHaveProperty('theme');
      expect(res1.body.theme).toHaveProperty('key');
      // default state starts with default theme active
      expect(typeof res1.body.theme.key).toBe('string');

      const res2 = await request(app).get('/api/themes');
      expect(res2.statusCode).toBe(200);
      expect(Array.isArray(res2.body.themes)).toBe(true);
      expect(res2.body.themes.length).toBeGreaterThan(0);
      // shape of items
      expect(res2.body.themes[0]).toHaveProperty('key');
      expect(res2.body.themes[0]).toHaveProperty('name');
      expect(res2.body.themes[0]).toHaveProperty('colors');
    });
  });

  describe('Admin: PUT /api/admin/theme', () => {
    test('401 without token; 403 with non-admin', async () => {
      const r1 = await request(app).put('/api/admin/theme').send({});
      expect(r1.statusCode).toBe(401);

      const r2 = await request(app)
        .put('/api/admin/theme')
        .set('Authorization', customerToken)
        .send({});
      expect(r2.statusCode).toBe(403);
    });

    test('200 updates themes, activeKey, schedule, and personalization; public reflects schedule', async () => {
      const now = Date.now();
      const from = new Date(now - 60_000).toISOString();
      const to = new Date(now + 60_000).toISOString();
      const payload = {
        personalizationEnabled: true,
        schedule: { from, to, key: 'summer' },
        activeKey: 'default', // should be ignored during schedule window
        themes: [
          { key: 'summer', name: 'Summer', colors: { primary: '#FF9900' }, animations: false },
        ],
      };

      const putRes = await request(app)
        .put('/api/admin/theme')
        .set('Authorization', adminToken)
        .send(payload);
      expect(putRes.statusCode).toBe(200);
      expect(putRes.body).toHaveProperty('themes');
      expect(putRes.body).toHaveProperty('activeKey');
      expect(putRes.body).toHaveProperty('updatedAt');

      // Public /api/theme should pick scheduled 'summer'
      const resTheme = await request(app).get('/api/theme');
      expect(resTheme.statusCode).toBe(200);
      expect(resTheme.body).toHaveProperty('theme');
      expect(resTheme.body.theme.key).toBe('summer');
      expect(resTheme.body).toHaveProperty('personalizationEnabled', true);
      expect(resTheme.body).toHaveProperty('schedule');

      // Public /api/themes should list 'summer'
      const resList = await request(app).get('/api/themes');
      const keys = resList.body.themes.map(t => t.key);
      expect(keys).toContain('summer');
    });

    test('200 can clear schedule and set activeKey back to default', async () => {
      const payload = {
        schedule: null,
        activeKey: 'default',
      };
      const res = await request(app)
        .put('/api/admin/theme')
        .set('Authorization', adminToken)
        .send(payload);
      expect(res.statusCode).toBe(200);

      const resTheme = await request(app).get('/api/theme');
      expect(resTheme.statusCode).toBe(200);
      expect(resTheme.body.theme.key).toBe('default');
      expect(resTheme.body.schedule).toBe(null);
    });
  });
});
