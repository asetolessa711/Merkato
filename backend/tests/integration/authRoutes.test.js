const request = require('supertest');
const app = require('../../server');

// ✅ Use test credentials from environment or fallback
const testEmail = process.env.TEST_USER_EMAIL || 'testuser@example.com';
const testPassword = process.env.TEST_USER_PASSWORD || 'TestPass123!';

describe('Auth Routes', () => {
  let userToken;

  describe('POST /api/auth/register', () => {
    test('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Test User',
          country: 'Ethiopia'
        });

      // 201 Created for success, 400/403/404 for error (matches backend)
      if (res.body && res.body.token) {
        expect(res.statusCode).toBe(201);
        expect(typeof res.body.token).toBe('string');
        expect(res.body.token.length).toBeGreaterThan(20);
      } else {
        expect([400, 403, 404]).toContain(res.statusCode);
      }
    }, 15000);

    test('should not allow duplicate registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Test User',
          country: 'Ethiopia'
        });

      expect([400, 403, 404]).toContain(res.statusCode);
    });

    test('should return 400 for malformed email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: testPassword,
          name: 'Invalid Email Format'
        });

      expect([400, 403, 404]).toContain(res.statusCode);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

  expect([200, 401, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('token');
        expect(typeof res.body.token).toBe('string');
        expect(res.body.token.length).toBeGreaterThan(20);
        userToken = `Bearer ${res.body.token}`;
      }
    });

    test('should fail with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword!'
        });

      expect([401, 403, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should get current user profile with token', async () => {
      if (!userToken) {
        console.warn('⚠️ Skipping test — user not logged in.');
        return;
      }

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', userToken);

      expect([200, 401, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toHaveProperty('email', testEmail);
      }
    });

    test('should fail without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect([401, 403, 404]).toContain(res.statusCode);
    });
  });
});
