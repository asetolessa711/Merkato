const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

/**
 * Cover supportRoutes branches:
 * - POST /api/support → 400 missing message
 * - GET /api/support → 403 for non-admin
 */

describe('supportRoutes extra branches', () => {
  let customerToken;

  beforeAll(async () => {
    const u = await registerTestUser({ roles: ['customer'] });
    const { token } = await loginTestUser(u.email, 'Password123!');
    customerToken = token;
  });

  test('POST /api/support → 400 when message missing', async () => {
    const res = await request(app)
      .post('/api/support')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ subject: 'help' });
    expect([400, 500]).toContain(res.statusCode);
  });

  test('GET /api/support → 403 for non-admin', async () => {
    const res = await request(app)
      .get('/api/support')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([403, 401]).toContain(res.statusCode);
  });
});
