const request = require('supertest');
const path = require('path');
let app = require('../../server');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('adminRoutes authz/validation branches', () => {
  let vendorUser, vendorAuth;
  let adminUser, adminAuth;

  beforeAll(async () => {
    // Create a vendor (no admin privileges)
    vendorUser = await registerTestUser({ roles: ['vendor'], name: 'Vendor UA' });
    const vLogin = await loginTestUser(vendorUser.email, 'Password123!');
    vendorAuth = `Bearer ${vLogin.token}`;

    // Create an admin
    adminUser = await registerTestUser({ roles: ['admin'], name: 'Admin UA' });
    const aLogin = await loginTestUser(adminUser.email, 'Password123!');
    adminAuth = `Bearer ${aLogin.token}`;
  });

  afterAll(async () => {
    try { if (adminUser?._id) await deleteTestUser(adminUser._id, adminAuth); } catch(_) {}
    try { if (vendorUser?._id) await deleteTestUser(vendorUser._id, adminAuth); } catch(_) {}
  });

  test('GET /api/admin/export-summary as vendor -> 403', async () => {
    const res = await request(app)
      .get('/api/admin/export-summary')
      .set('Authorization', vendorAuth);
    expect(res.statusCode).toBe(403);
  });

  test('POST /api/admin/promo-campaigns missing fields -> 400', async () => {
    // name/startDate/endDate required per route validation
    const res = await request(app)
      .post('/api/admin/promo-campaigns')
      .set('Authorization', adminAuth)
      .send({ description: 'no required fields' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});
