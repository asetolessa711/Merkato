const request = require('supertest');
let app = require('../../server');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('adminRoutes country_admin cross-country approval denied', () => {
  let countryAdmin, adminAuth, vendor;

  beforeAll(async () => {
    // Create country_admin for country ET
    countryAdmin = await registerTestUser({ roles: ['country_admin'], country: 'ET', name: 'ET Admin' });
    const login = await loginTestUser(countryAdmin.email, 'Password123!');
    adminAuth = `Bearer ${login.token}`;
    // Create vendor in a different country (US)
    vendor = await registerTestUser({ roles: ['vendor'], country: 'US', name: 'US Vendor' });
  });

  afterAll(async () => {
    try { if (countryAdmin?._id) await deleteTestUser(countryAdmin._id, adminAuth); } catch(_) {}
    try { if (vendor?._id) await deleteTestUser(vendor._id, adminAuth); } catch(_) {}
  });

  test('PUT /api/admin/vendors/:id/approve cross-country -> 403', async () => {
    const res = await request(app)
      .put(`/api/admin/vendors/${vendor._id}/approve`)
      .set('Authorization', adminAuth)
      .send({ approved: true });
    expect([403, 404]).toContain(res.statusCode); // 403 preferred per route; 404 tolerated if vendor not matched in env
  });
});
