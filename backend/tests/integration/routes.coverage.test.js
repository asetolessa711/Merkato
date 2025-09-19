const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

describe('Express Routes — coverage pass (in-memory Mongo)', () => {
  // Using server.js default test DB connection from env

  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  describe('Auth flows', () => {
    test('register 400 on bad email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'x', email: 'bad', password: '123456', country: 'ET' });
      expect(res.statusCode).toBe(400);
    });

    test('register 400 on missing country', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'User', email: 'u1@example.com', password: 'Password1!' });
      expect(res.statusCode).toBe(400);
    });

    test('register then login 201/200 happy path', async () => {
      const email = `u_${Date.now()}@example.com`;
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Happy', email, password: 'Password1!', country: 'ET' });
      expect([200,201]).toContain(reg.statusCode);
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Password1!' });
      expect(login.statusCode).toBe(200);
      expect(login.body.token).toBeTruthy();
    });

    test('login 401 on wrong password', async () => {
      const email = `wrong_${Date.now()}@example.com`;
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Wrong', email, password: 'Password1!', country: 'ET' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'nope' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Protected admin route /api/auth/admin', () => {
    test('401 when no token', async () => {
      const res = await request(app).get('/api/auth/admin');
      expect(res.statusCode).toBe(401);
    });

    test('403 when customer token', async () => {
      const email = `c_${Date.now()}@example.com`;
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ name: 'C', email, password: 'Password1!', country: 'ET' });
      expect([200,201]).toContain(reg.statusCode);
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Password1!' });
      const token = login.body.token;
      const res = await request(app)
        .get('/api/auth/admin')
        .set('Authorization', `Bearer ${token}`);
      expect([401,403]).toContain(res.statusCode);
    });
  });

  describe('Categories', () => {
    test('GET /api/categories responds 200 with menu', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.menu)).toBe(true);
    });
  });
});
