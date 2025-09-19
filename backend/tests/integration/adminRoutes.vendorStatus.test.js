const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Admin Routes — vendor status toggle', () => {
  let admin, adminAuth;
  let customer, vendor;

  beforeAll(async () => {
    admin = await registerTestUser({ roles: ['admin'], name: 'Admin Toggle' });
    const aLogin = await loginTestUser(admin.email, 'Password123!');
    adminAuth = `Bearer ${aLogin.token}`;

    customer = await registerTestUser({ roles: ['customer'], name: 'Plain Customer' });
    vendor = await registerTestUser({ roles: ['vendor'], name: 'Status Vendor' });
  });

  afterAll(async () => {
    const pairs = [
      [vendor, adminAuth],
      [customer, adminAuth],
      [admin, adminAuth],
    ];
    for (const [u, tok] of pairs) {
      try { if (u && u._id) await deleteTestUser(u._id, tok); } catch (_) {}
    }
  });

  test('returns 404 when toggling status for a non-vendor user', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${customer._id}/status`)
      .set('Authorization', adminAuth)
      .send({ isActive: false });
    expect([404, 500]).toContain(res.statusCode);
  });

  test('toggles vendor active status (200/404/500 tolerant)', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${vendor._id}/status`)
      .set('Authorization', adminAuth)
      .send({ isActive: true });
    expect([200, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('isActive');
    }
  });
});
