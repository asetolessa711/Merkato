const request = require('supertest');
const app = require('../../server');
const {
  registerTestUser,
  loginTestUser,
  deleteTestUser
} = require('../utils/testUserUtils');
const mongoose = require('mongoose');

const adminToken = process.env.TEST_ADMIN_TOKEN;

let testUser, authToken;
let originalProfile = {};
let originalAddress = {};

describe('Customer Routes', () => {
  beforeAll(async () => {
    jest.setTimeout(20000); // Increase timeout for slow setup
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

    await mongoose.connection.close();
  });

  // --------- Tests continue below with authToken instead of userToken ---------








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
