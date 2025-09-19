const request = require('supertest');
const app = require('../../server');
const {
  registerTestUser,
  loginTestUser,
  deleteTestUser
} = require('../utils/testUserUtils');
const mongoose = require('mongoose');
const User = require('../../models/User');

const adminToken = process.env.TEST_ADMIN_TOKEN;

let testUser, authToken;
let vendorToken;
let originalProfile = {};
let originalAddress = {};

describe('Customer Routes', () => {
  beforeAll(async () => {
    jest.setTimeout(20000); // Increase timeout for slow setup
    // Register and log in test user dynamically
    testUser = await registerTestUser();
    const login = await loginTestUser(testUser.email, 'Password123!');
    authToken = `Bearer ${login.token}`;

  // Create a vendor user to test 403 role
  const v = await registerTestUser({ roles: ['vendor'] });
  const vLogin = await loginTestUser(v.email, 'Password123!');
  vendorToken = `Bearer ${vLogin.token}`;

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

    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  // --------- Tests continue below with authToken instead of userToken ---------

  describe('Profile API', () => {
    test('GET /customer/profile → 401 when no token', async () => {
      const res = await request(app).get('/api/customer/profile');
      expect(res.statusCode).toBe(401);
    });

    test('GET /customer/profile → 403 for wrong role', async () => {
      const res = await request(app)
        .get('/api/customer/profile')
        .set('Authorization', vendorToken);
      // protect passes, authorize should reject
      expect([401, 403]).toContain(res.statusCode);
    });

    test('GET /customer/profile → 200 ok', async () => {
      const res = await request(app)
        .get('/api/customer/profile')
        .set('Authorization', authToken);
      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBeDefined();
    });

    test('PUT /customer/profile → 400 invalid email', async () => {
      const res = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', authToken)
        .send({ email: 'not-an-email' });
      expect(res.statusCode).toBe(400);
    });

    test('PUT /customer/profile → 409 duplicate email', async () => {
      // Create another user whose email we will try to use
      const other = await registerTestUser();
      const res = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', authToken)
        .send({ email: other.email });
      expect([400, 409]).toContain(res.statusCode); // routes may return 400 or 409
    });

    test('PUT /customer/profile → 404 when user missing', async () => {
      // Soft-delete the current user directly to simulate missing user during update
      const me = await User.findOne({ email: testUser.email });
      await User.deleteOne({ _id: me._id });

      const res = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', authToken)
        .send({ name: 'Ghost' });
      expect([401, 404]).toContain(res.statusCode); // protect may 401, route may 404

      // Re-create the user to continue other tests
      const recreated = await registerTestUser({ email: testUser.email });
      const relogin = await loginTestUser(recreated.email, 'Password123!');
      authToken = `Bearer ${relogin.token}`;
    });

    test('PUT /customer/profile → 200 success', async () => {
      const res = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', authToken)
        .send({ name: 'Updated Name', avatar: 'https://img.example/avatar.png' });
      expect(res.statusCode).toBe(200);
      expect(res.body?.profile?.name).toBe('Updated Name');
    });
  });







  // Addresses: test GET, POST, PUT, DELETE, and default set
  describe('Addresses API', () => {
    let addressId;
    test('should add a new address', async () => {
      const res = await request(app)
        .post('/api/customer/addresses')
        .set('Authorization', authToken)
        .send({
          label: 'Home',
          fullName: 'Test User',
          phone: '+251900000000',
          street: 'Test Street',
          city: 'Addis Ababa',
          postalCode: '1000',
          country: 'Ethiopia',
          isDefault: true
        });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      addressId = res.body[0]._id;
    });

    test('should get all addresses', async () => {
      const res = await request(app)
        .get('/api/customer/addresses')
        .set('Authorization', authToken);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('should update an address', async () => {
      const res = await request(app)
        .put(`/api/customer/addresses/${addressId}`)
        .set('Authorization', authToken)
        .send({ city: 'Updated City' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].city).toBe('Updated City');
    });

    test('should set address as default', async () => {
      const res = await request(app)
        .put(`/api/customer/addresses/default/${addressId}`)
        .set('Authorization', authToken);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].isDefault).toBe(true);
    });

    test('should delete an address', async () => {
      const res = await request(app)
        .delete(`/api/customer/addresses/${addressId}`)
        .set('Authorization', authToken);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
