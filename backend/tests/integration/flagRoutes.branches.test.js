const request = require('supertest');
const app = require('../../server');
const Flag = require('../../models/Flag');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('flagRoutes branches', () => {
  let adminToken;

  beforeAll(async () => {
    const reg = await registerTestUser({ roles: ['admin'], name: 'Route Admin', country: 'ET' });
    const creds = await loginTestUser(reg.email, 'Password123!');
    adminToken = creds.token;
  });

  test('GET /api/flags handles model error with 500', async () => {
    const spy = jest.spyOn(Flag, 'find').mockImplementation(() => {
      // Return a chainable that throws during populate
      return {
        populate() {
          throw new Error('boom');
        },
      };
    });

    const res = await request(app)
      .get('/api/flags')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('message', 'Failed to fetch flags');
    spy.mockRestore();
  });

  test('PATCH /api/flags/:id/approve with missing flag -> 404', async () => {
    const res = await request(app)
      .patch('/api/flags/507f1f77bcf86cd799439011/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message', 'Flag not found');
  });

  test('PATCH /api/flags/:id/reject with missing flag -> 404', async () => {
    const res = await request(app)
      .patch('/api/flags/507f1f77bcf86cd799439011/reject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message', 'Flag not found');
  });
});
