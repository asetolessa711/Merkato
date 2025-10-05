const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('railsRoutes SoV (share of voice) summary', () => {
  let adminToken;
  beforeAll(async () => {
    const reg = await registerTestUser({ roles: ['admin'] });
    const login = await loginTestUser(reg.email, 'Password123!');
    adminToken = `Bearer ${login.token}`;
  });

  it('GET /api/admin/rails/sov returns array with owner/tactic keys', async () => {
    const res = await request(app)
      .get('/api/admin/rails/sov?window=3')
      .set('Authorization', adminToken)
      .expect(200);
    expect(res.body).toHaveProperty('sov');
    expect(Array.isArray(res.body.sov)).toBe(true);
    // Items may be empty if no metrics, but when present they contain expected keys
    for (const row of res.body.sov) {
      expect(row).toHaveProperty('owner');
      expect(row).toHaveProperty('tactic');
      expect(row).toHaveProperty('imp');
    }
  });
});
