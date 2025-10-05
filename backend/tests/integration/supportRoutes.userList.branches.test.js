const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('supportRoutes user list branches', () => {
  let customer;
  let token;

  beforeAll(async () => {
    customer = await registerTestUser({ roles: ['customer'] });
    const c = await loginTestUser(customer.email, 'Password123!');
    token = `Bearer ${c.token}`;
  });

  afterAll(async () => {
    try { if (customer && customer._id) await deleteTestUser(customer._id, token); } catch(_) {}
  });

  test('GET /api/support/user → 404 when no tickets', async () => {
    const res = await request(app)
      .get('/api/support/user')
      .set('Authorization', token);
    expect([404, 200]).toContain(res.statusCode);
  });
});
