const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('railsRoutes preflight failOnWarnings', () => {
  let adminToken;
  beforeAll(async () => {
    const adminReg = await registerTestUser({ name: 'PF Admin' });
    const adminLogin = await loginTestUser(adminReg.email, 'Password123!');
    await User.findByIdAndUpdate(adminLogin.user._id, { $addToSet: { roles: 'admin' } });
    adminToken = adminLogin.token;
  });

  it('returns ok:false when failOnWarnings=true and minItems not satisfied', async () => {
    const res = await request(app)
      .post('/api/admin/rails/preflight')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [], capacity: { minItems: 2 }, failOnWarnings: true })
      .expect(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.warnings).toContain('BELOW_MIN_ITEMS');
  });
});
