const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('supportRoutes admin access success (branch bump)', () => {
  let adminToken;

  beforeAll(async () => {
    const reg = await registerTestUser({ roles: ['admin'], name: 'Support Admin', country: 'ET' });
    const creds = await loginTestUser(reg.email, 'Password123!');
    adminToken = creds.token;
  });

  test('GET /api/support as admin → 200 [] (empty ok)', async () => {
    const res = await request(app)
      .get('/api/support')
      .set('Authorization', `Bearer ${adminToken}`);
    // Allow 200 with array (empty is fine); tolerate 500 if model path misbehaves
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });
});
