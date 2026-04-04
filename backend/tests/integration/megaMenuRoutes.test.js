const request = require('supertest');
const path = require('path');
const fsp = require('fs/promises');
const mongoose = require('mongoose');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('Mega Menu Routes @mega-menu', () => {
  let adminToken;
  let customerToken;

  const DATA_DIR = path.join(__dirname, '..', '..', 'uploads');
  const DATA_FILE = path.join(DATA_DIR, 'mega-menu.json');
  const AUDIT_FILE = path.join(DATA_DIR, 'mega-menu-audit.log.jsonl');

  let backupMenu = null;
  let backupAudit = null;

  beforeAll(async () => {
    // Create users and tokens
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

    // Backup files to avoid persistent side-effects
    try { backupMenu = await fsp.readFile(DATA_FILE, 'utf8'); } catch (_) {}
    try { backupAudit = await fsp.readFile(AUDIT_FILE, 'utf8'); } catch (_) {}
    await fsp.mkdir(DATA_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Restore previous state best-effort
    try {
      if (backupMenu !== null) {
        await fsp.writeFile(DATA_FILE, backupMenu, 'utf8');
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

  describe('Public: GET /api/categories', () => {
    test('returns simplified menu array and filters hidden items', async () => {
      // First, store a menu with hidden items via admin PUT
      const payload = {
        menu: [
          { title: 'Visible Cat', icon: '✅', links: [
            { label: 'Shown Link', to: '/shop?cat=shown' },
            { label: 'Hidden Link', to: '/shop?cat=hidden', status: 'hidden' },
          ]},
          { title: 'Hidden Cat', status: 'hidden', links: [
            { label: 'Also Hidden', to: '/shop?cat=also-hidden' },
          ]},
        ],
      };
      const putRes = await request(app)
        .put('/api/admin/mega-menu')
        .set('Authorization', adminToken)
        .send(payload);
      expect(putRes.statusCode).toBe(200);

      // Now read public categories and verify filtering
      const res = await request(app).get('/api/categories');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('menu');
      expect(Array.isArray(res.body.menu)).toBe(true);
      // Hidden category should be filtered out
      const titles = res.body.menu.map((c) => c.title);
      expect(titles).toContain('Visible Cat');
      expect(titles).not.toContain('Hidden Cat');
      // Hidden links should be filtered out
      const visibleCat = res.body.menu.find((c) => c.title === 'Visible Cat');
      expect(visibleCat).toBeTruthy();
      expect(Array.isArray(visibleCat.links)).toBe(true);
      const linkLabels = visibleCat.links.map((l) => l.label);
      expect(linkLabels).toContain('Shown Link');
      expect(linkLabels).not.toContain('Hidden Link');
    });
  });

  describe('Admin: GET /api/admin/mega-menu', () => {
    test('401 without token', async () => {
      const res = await request(app).get('/api/admin/mega-menu');
      expect(res.statusCode).toBe(401);
    });

    test('403 with non-admin token', async () => {
      const res = await request(app)
        .get('/api/admin/mega-menu')
        .set('Authorization', customerToken);
      expect(res.statusCode).toBe(403);
    });

    test('200 with admin token and returns structure', async () => {
      const res = await request(app)
        .get('/api/admin/mega-menu')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('menu');
      expect(Array.isArray(res.body.menu)).toBe(true);
      expect(res.body).toHaveProperty('updatedAt');
      expect(res.body).toHaveProperty('version');
    });

    test('reflects last saved menu on subsequent GET', async () => {
      const payload = { menu: [ { title: 'Persist Cat', links: [ { label: 'Persist', to: '/x' } ] } ] };
      const putRes = await request(app)
        .put('/api/admin/mega-menu')
        .set('Authorization', adminToken)
        .send(payload);
      expect(putRes.statusCode).toBe(200);

      const res = await request(app)
        .get('/api/admin/mega-menu')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      const titles = (res.body.menu || []).map(m => m.title);
      expect(titles).toContain('Persist Cat');
    });
  });

  describe('Admin: PUT /api/admin/mega-menu', () => {
    test('422 when payload missing menu array', async () => {
      const res = await request(app)
        .put('/api/admin/mega-menu')
        .set('Authorization', adminToken)
        .send({});
      expect(res.statusCode).toBe(422);
      expect(res.body.message).toMatch(/invalid mega menu payload/i);
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.some((e) => e.path === 'menu')).toBe(true);
    });

    test('422 with field-level errors for invalid category/link fields', async () => {
      const res = await request(app)
        .put('/api/admin/mega-menu')
        .set('Authorization', adminToken)
        .send({
          menu: [
            {
              title: '   ',
              status: 'active',
              links: [
                { label: '', to: 'javascript:alert(1)', status: 'active' },
              ],
            },
          ],
        });

      expect(res.statusCode).toBe(422);
      expect(res.body.message).toMatch(/invalid mega menu payload/i);
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.some((e) => e.path === 'menu[0].title')).toBe(true);
      expect(res.body.errors.some((e) => e.path === 'menu[0].links[0].label')).toBe(true);
      expect(res.body.errors.some((e) => e.path === 'menu[0].links[0].to')).toBe(true);
    });

    test('200 saves provided menu and returns normalized payload', async () => {
      const payload = {
        menu: [
          { title: 'New Cat', icon: '🆕', links: [ { label: 'Go', to: '/shop?cat=new' } ] },
        ],
      };
      const res = await request(app)
        .put('/api/admin/mega-menu')
        .set('Authorization', adminToken)
        .send(payload);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('menu');
      expect(Array.isArray(res.body.menu)).toBe(true);
      expect(res.body.menu.length).toBe(1);
      expect(res.body).toHaveProperty('updatedAt');
      expect(res.body).toHaveProperty('version');
    });
  });

  describe('Admin: GET /api/admin/mega-menu/audit', () => {
    test('401 without token; 403 with non-admin', async () => {
      const r1 = await request(app).get('/api/admin/mega-menu/audit');
      expect(r1.statusCode).toBe(401);

      const r2 = await request(app)
        .get('/api/admin/mega-menu/audit')
        .set('Authorization', customerToken);
      expect(r2.statusCode).toBe(403);
    });

    test('200 with admin token; returns entries array and respects limit', async () => {
      // Trigger at least one audit entry by saving a menu
      const saveRes = await request(app)
        .put('/api/admin/mega-menu')
        .set('Authorization', adminToken)
        .send({ menu: [ { title: 'Audit Cat', links: [] } ] });
      expect(saveRes.statusCode).toBe(200);

      const res = await request(app)
        .get('/api/admin/mega-menu/audit?limit=1')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('entries');
      expect(Array.isArray(res.body.entries)).toBe(true);
      expect(res.body.entries.length).toBeLessThanOrEqual(1);
      if (res.body.entries.length > 0) {
        expect(res.body.entries[0]).toHaveProperty('action');
        expect(res.body.entries[0].action).toBe('save');
      }
    });

    test('returns empty entries when audit log file is missing', async () => {
      try { await fsp.unlink(AUDIT_FILE); } catch (_) {}
      const res = await request(app)
        .get('/api/admin/mega-menu/audit')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('entries');
      expect(Array.isArray(res.body.entries)).toBe(true);
      expect(res.body.entries.length).toBe(0);
    });

    test('caps limit at 200 when requesting a large number', async () => {
      // Create a few entries
      for (let i = 0; i < 3; i++) {
        // eslint-disable-next-line no-await-in-loop
        await request(app)
          .put('/api/admin/mega-menu')
          .set('Authorization', adminToken)
          .send({ menu: [ { title: `Cap ${i}`, links: [] } ] });
      }
      const res = await request(app)
        .get('/api/admin/mega-menu/audit?limit=5000')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.entries)).toBe(true);
      expect(res.body.entries.length).toBeLessThanOrEqual(200);
    });
  });

  describe('Public: GET /api/categories (invalid JSON fallback)', () => {
    test('returns default wrapped menu when the file contains invalid JSON', async () => {
      await fsp.mkdir(DATA_DIR, { recursive: true });
      await fsp.writeFile(DATA_FILE, '{not-json}', 'utf8');
      const res = await request(app).get('/api/categories');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('menu');
      expect(Array.isArray(res.body.menu)).toBe(true);
      expect(res.body).toHaveProperty('updatedAt');
      expect(res.body).toHaveProperty('version');
    });
  });
});
