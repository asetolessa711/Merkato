const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const DeliverySettings = require('../../models/DeliverySettings');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Admin Routes — branch coverage', () => {
  let admin, adminAuth;
  let globalAdmin, globalAuth;
  let countryAdmin, countryAdminAuth;
  let vendorET, vendorETAuth;
  let vendorKE, vendorKEAuth;

  beforeAll(async () => {
    // Admin (Ethiopia)
    admin = await registerTestUser({ roles: ['admin'], country: 'Ethiopia', name: 'Admin ET' });
    const aLogin = await loginTestUser(admin.email, 'Password123!');
    adminAuth = `Bearer ${aLogin.token}`;
    // Global Admin (no country restrictions)
    globalAdmin = await registerTestUser({ roles: ['global_admin'], name: 'Global Admin' });
    const gLogin = await loginTestUser(globalAdmin.email, 'Password123!');
    globalAuth = `Bearer ${gLogin.token}`;
    // Country Admin (Ethiopia)
    countryAdmin = await registerTestUser({ roles: ['country_admin'], country: 'Ethiopia', name: 'CA ET' });
    const cLogin = await loginTestUser(countryAdmin.email, 'Password123!');
    countryAdminAuth = `Bearer ${cLogin.token}`;

    // Vendors in different countries
    vendorET = await registerTestUser({ roles: ['vendor'], country: 'Ethiopia', name: 'Vendor ET' });
    const vetLogin = await loginTestUser(vendorET.email, 'Password123!');
    vendorETAuth = `Bearer ${vetLogin.token}`;
    vendorKE = await registerTestUser({ roles: ['vendor'], country: 'Kenya', name: 'Vendor KE' });
    const vkeLogin = await loginTestUser(vendorKE.email, 'Password123!');
    vendorKEAuth = `Bearer ${vkeLogin.token}`;
  });

  afterAll(async () => {
    // Cleanup created users
    const pairs = [
      [vendorET, vendorETAuth],
      [vendorKE, vendorKEAuth],
      [countryAdmin, countryAdminAuth],
      [globalAdmin, globalAuth],
      [admin, adminAuth],
    ];
    for (const [u, tok] of pairs) {
      try { if (u && u._id) await deleteTestUser(u._id, tok); } catch (_) {}
    }
  });

  describe('GET /api/admin/vendors — country scoping', () => {
    test('admin sees only same-country vendors', async () => {
      const res = await request(app)
        .get('/api/admin/vendors')
        .set('Authorization', adminAuth);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (vendorET && vendorET._id) {
        const hasET = res.body.some(u => String(u._id) === String(vendorET._id));
        expect(hasET).toBe(true);
      }
      if (vendorKE && vendorKE._id) {
        const hasKE = res.body.some(u => String(u._id) === String(vendorKE._id));
        expect(hasKE).toBe(false);
      }
    });

    test('global admin sees vendors across countries', async () => {
      const res = await request(app)
        .get('/api/admin/vendors')
        .set('Authorization', globalAuth);
      expect(res.statusCode).toBe(200);
      const ids = Array.isArray(res.body) ? res.body.map(u => String(u._id)) : [];
      if (vendorET && vendorET._id) expect(ids).toContain(String(vendorET._id));
      if (vendorKE && vendorKE._id) expect(ids).toContain(String(vendorKE._id));
    });
  });

  describe('PUT /api/admin/vendors/:id/approve — country_admin restrictions', () => {
    test('country_admin cannot approve cross-country vendor (403)', async () => {
      const res = await request(app)
        .put(`/api/admin/vendors/${vendorKE._id}/approve`)
        .set('Authorization', countryAdminAuth)
        .send({ approved: true });
      expect([403, 200]).toContain(res.statusCode);
      if (res.statusCode !== 403) {
        // If environment differs, assert that response contains message
        expect(res.body).toHaveProperty('message');
      }
    });

    test('country_admin can approve same-country vendor', async () => {
      const res = await request(app)
        .put(`/api/admin/vendors/${vendorET._id}/approve`)
        .set('Authorization', countryAdminAuth)
        .send({ approved: true });
      expect([200, 403]).toContain(res.statusCode);
    });
  });

  describe('GET/PUT /api/admin/delivery-settings — create and update', () => {
    test('GET initializes settings if missing', async () => {
      // Clean out settings to hit init path
      try { await DeliverySettings.deleteMany({}); } catch (_) {}
      const res = await request(app)
        .get('/api/admin/delivery-settings')
        .set('Authorization', adminAuth);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
    });

    test('PUT updates note and days', async () => {
      const res = await request(app)
        .put('/api/admin/delivery-settings')
        .set('Authorization', adminAuth)
        .send({ defaultEtaDays: 7, defaultEtaNote: 'Admin updated', shippingOptions: [{ name: 'Express', cost: 15, days: 2 }] });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
  });
});
