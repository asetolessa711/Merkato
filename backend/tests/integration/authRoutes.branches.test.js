const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const ResetToken = require('../../models/ResetToken');
const User = require('../../models/User');

describe('Auth Routes (Branch Coverage)', () => {
  const unique = Date.now();
  const baseEmail = `auth-branches-${unique}@example.com`;
  const password = 'Password123!';

  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  describe('POST /api/auth/register', () => {
    test('400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'bad', password, name: 'X' });
      expect(res.statusCode).toBe(400);
    });

    test('201 for valid registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: baseEmail, password, name: 'Auth Branch', country: 'Ethiopia' });
      expect([201, 200]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('token');
    });

    test('400 duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: baseEmail, password, name: 'Auth Branch', country: 'Ethiopia' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    test('401 for bad credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: baseEmail, password: 'Wrong!' });
      expect(res.statusCode).toBe(401);
    });

    test('200 for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: baseEmail, password });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
  });

  describe('Password reset flow', () => {
    test('forgot-password 400 when email missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});
      expect(res.statusCode).toBe(400);
    });

    test('forgot-password 200 even when account missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody-' + unique + '@example.com' });
      expect(res.statusCode).toBe(200);
    });

    test('reset-password 400 when missing token/password', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: '', password: '' });
      expect(res.statusCode).toBe(400);
    });

    test('reset-password 400 for invalid/expired token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid', password: 'NewPass123!' });
      expect(res.statusCode).toBe(400);
    });

    test('reset-password 404 when user not found', async () => {
      const tokenPlain = 'deadbeef';
      const crypto = require('crypto');
      const hashed = crypto.createHash('sha256').update(tokenPlain).digest('hex');
      const ghostUserId = new mongoose.Types.ObjectId();
      await ResetToken.create({ userId: ghostUserId, token: hashed, expiresAt: Date.now() + 3600000 });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: tokenPlain, password: 'NewPass123!' });
      expect(res.statusCode).toBe(404);
      await ResetToken.deleteMany({ userId: ghostUserId });
    });

    test('reset-password 200 with valid token', async () => {
      // Create a user directly to ensure we can attach a reset token
      const u = await User.create({ name: 'Reset Me', email: `reset-${unique}@example.com`, password: 'OldPass123!', roles: ['customer'], country: 'Ethiopia' });
      const tokenPlain = 'resettoken-' + unique;
      const crypto = require('crypto');
      const hashed = crypto.createHash('sha256').update(tokenPlain).digest('hex');
      await ResetToken.create({ userId: u._id, token: hashed, expiresAt: Date.now() + 3600000 });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: tokenPlain, password: 'NewPass123!' });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/success/i);
      await ResetToken.deleteMany({ userId: u._id });
      await User.deleteOne({ _id: u._id });
    });
  });
});
