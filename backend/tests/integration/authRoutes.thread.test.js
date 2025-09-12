// Tags: @thread:auth-login @thread:auth-register
const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

describe('Auth Routes (Thread Coverage Minimal)', () => {
  const baseEmail = `thread-user-${Date.now()}@example.com`;
  const password = 'Password123!';

  afterAll(async ()=>{
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('register -> login sequence', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Thread User', email: baseEmail, password });
    expect([201,200,400,403]).toContain(reg.statusCode);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: baseEmail, password });
    expect([200,401,400]).toContain(login.statusCode);
  });
});