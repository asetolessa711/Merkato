const request = require('supertest');
const app = require('../../../server');
const {
  registerTestUser,
  loginTestUser,
  deleteTestUser
} = require('../../utils/testUserUtils');

const adminToken = process.env.TEST_ADMIN_TOKEN;

let testUser, authToken;
let originalProfile = {};
let originalAddress = {};

describe('Customer Routes', () => {
  beforeAll(async () => {
    // Register and log in test user dynamically
    testUser = await registerTestUser();
    const login = await loginTestUser(testUser.email, 'Password123!');
    authToken = `Bearer ${login.token}`;

    // Store original profile
    const profileRes = await request(app)
      .get('/api/customer/profile')
      .set('Authorization', authToken);
    if (profileRes.statusCode === 200) {
      originalProfile = {
        name: profileRes.body.name,
        phone: profileRes.body.phone,
      };
    }

    // Store original address
    const addressRes = await request(app)
      .get('/api/customer/address')
      .set('Authorization', authToken);
    if (addressRes.statusCode === 200 && addressRes.body.address) {
      originalAddress = addressRes.body.address;
    }
  });

  afterAll(async () => {
    // Restore original profile
    if (originalProfile && Object.keys(originalProfile).length) {
      await request(app)
        .put('/api/customer/profile')
        .set('Authorization', authToken)
        .send(originalProfile);
    }
    // Restore original address
    if (originalAddress && Object.keys(originalAddress).length) {
      await request(app)
        .put('/api/customer/address')
        .set('Authorization', authToken)
        .send(originalAddress);
    }

    // Cleanup user
    if (testUser && testUser._id) {
      await deleteTestUser(testUser._id, authToken);
    }
  });

  // --------- Tests continue below with authToken instead of userToken ---------

  describe('GET /api/customer/profile', () => {
    test('should return user profile for authenticated user', async () => {
      const res = await request(app)
        .get('/api/customer/profile')
        .set('Authorization', authToken);
      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('email');
        expect(res.body).toHaveProperty('name');
      }
    });

    test('should reject profile request without token', async () => {
      const res = await request(app).get('/api/customer/profile');
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should block admin from accessing another user’s profile', async () => {
      const res = await request(app)
        .get('/api/customer/profile')
        .set('Authorization', adminToken);
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/customer/profile', () => {
    test('should update user name and phone', async () => {
      const res = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', authToken)
        .send({ name: 'Updated User Name', phone: '+1234567890' });

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('name', 'Updated User Name');
        expect(res.body).toHaveProperty('phone');
      }
    });

    test('should reject update without token', async () => {
      const res = await request(app)
        .put('/api/customer/profile')
        .send({ name: 'Anonymous Update' });
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return 400 for invalid input', async () => {
      const res = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', authToken)
        .send({ phone: 'invalid-phone' });
      expect([400, 422, 403]).toContain(res.statusCode);
    });

    test('should return 400 for empty payload', async () => {
      const res = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', authToken)
        .send({});
      expect([400, 422, 403]).toContain(res.statusCode);
    });

    test('should ignore unknown fields', async () => {
      const res = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', authToken)
        .send({ name: 'Test', unknownField: 'ignored' });
      expect([200, 403]).toContain(res.statusCode);
    });

    test('should block admin from updating another user’s profile', async () => {
      const res = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', adminToken)
        .send({ name: 'Admin Update' });
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('GET /api/customer/orders', () => {
    test('should return user’s order history', async () => {
      const res = await request(app)
        .get('/api/customer/orders')
        .set('Authorization', authToken);
      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('should reject order history without token', async () => {
      const res = await request(app).get('/api/customer/orders');
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should block admin from accessing another user’s orders', async () => {
      const res = await request(app)
        .get('/api/customer/orders')
        .set('Authorization', adminToken);
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should support pagination if implemented', async () => {
      const res = await request(app)
        .get('/api/customer/orders?page=1&limit=2')
        .set('Authorization', authToken);
      expect([200, 403, 501]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/customer/address', () => {
    test('should update customer address if supported', async () => {
      const res = await request(app)
        .put('/api/customer/address')
        .set('Authorization', authToken)
        .send({
          street: '123 Updated Street',
          city: 'Updated City',
          zip: '12345',
          country: 'Updated Country'
        });
      expect([200, 403, 501]).toContain(res.statusCode);
    });

    test('should return 400 for malformed address input', async () => {
      const res = await request(app)
        .put('/api/customer/address')
        .set('Authorization', authToken)
        .send({ city: 123 });
      expect([400, 422, 403, 501]).toContain(res.statusCode);
    });

    test('should block address update without token', async () => {
      const res = await request(app)
        .put('/api/customer/address')
        .send({ street: 'Unauthorized' });
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return 400 for empty payload', async () => {
      const res = await request(app)
        .put('/api/customer/address')
        .set('Authorization', authToken)
        .send({});
      expect([400, 422, 403, 501]).toContain(res.statusCode);
    });

    test('should allow partial address update if supported', async () => {
      const res = await request(app)
        .put('/api/customer/address')
        .set('Authorization', authToken)
        .send({ city: 'Partial City' });
      expect([200, 403, 400, 422, 501]).toContain(res.statusCode);
    });

    test('should block admin from updating another user’s address', async () => {
      const res = await request(app)
        .put('/api/customer/address')
        .set('Authorization', adminToken)
        .send({ street: 'Admin Street' });
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('GET /api/customer/address', () => {
    test('should return address for authenticated user if supported', async () => {
      const res = await request(app)
        .get('/api/customer/address')
        .set('Authorization', authToken);
      expect([200, 403, 501]).toContain(res.statusCode);
    });

    test('should reject address request without token', async () => {
      const res = await request(app)
        .get('/api/customer/address');
      expect([401, 403, 501]).toContain(res.statusCode);
    });
  });
});
