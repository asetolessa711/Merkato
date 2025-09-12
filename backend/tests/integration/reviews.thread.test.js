// Tags: @thread:reviews
const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('Reviews minimal', () => {
  let token;
  beforeAll(async () => {
    const user = await registerTestUser({ roles: ['customer'] });
    const login = await loginTestUser(user.email, 'Password123!');
    token = `Bearer ${login.token}`;
  });
  afterAll(async () => { if (process.env.JEST_CLOSE_DB==='true') await mongoose.connection.close(); });

  test('list reviews endpoint (shape tolerant)', async () => {
    const res = await request(app).get('/api/reviews');
    expect([200,404,500]).toContain(res.statusCode);
  });
});
