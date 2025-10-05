const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('railsRoutes audit log (empty file path)', () => {
  let adminToken;

  beforeAll(async () => {
    const adminReg = await registerTestUser({ name: 'Audit Admin' });
    const adminLogin = await loginTestUser(adminReg.email, 'Password123!');
    await User.findByIdAndUpdate(adminLogin.user._id, { $addToSet: { roles: 'admin' } });
    adminToken = adminLogin.token;
  });

  it('GET /api/admin/rails/audit returns entries array (empty ok)', async () => {
    const res = await request(app)
      .get('/api/admin/rails/audit')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('entries');
    expect(Array.isArray(res.body.entries)).toBe(true);
  });
});
