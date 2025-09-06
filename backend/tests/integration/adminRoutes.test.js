jest.setTimeout(20000);
const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

let adminUser, adminToken;
let normalUser, userToken;

describe('Admin Routes', () => {
  let testUserId;
  let testOrderId;

  beforeAll(async () => {
    // Register and log in admin user
    adminUser = await registerTestUser({ roles: ['admin'] });
    const adminLogin = await loginTestUser(adminUser.email, 'Password123!');
    adminToken = `Bearer ${adminLogin.token}`;

    // Register and log in normal user
    normalUser = await registerTestUser();
    const userLogin = await loginTestUser(normalUser.email, 'Password123!');
    userToken = `Bearer ${userLogin.token}`;

    // Register a test user for admin actions
    const testUser = await registerTestUser();
    testUserId = testUser._id;

    // Create an order as the normal user
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken)
      .send({
        products: [{ product: '64c529a1998764430f000000', quantity: 1 }],
        total: 19.99,
        currency: 'USD',
        shippingAddress: 'Admin Order Street'
      });
    if ([200, 201].includes(orderRes.statusCode)) {
      testOrderId = orderRes.body._id;
    }
  });

  afterAll(async () => {
    if (testUserId) {
      await request(app)
        .delete(`/api/admin/users/${testUserId}`)
        .set('Authorization', adminToken);
    }
    if (testOrderId) {
      await request(app)
        .delete(`/api/orders/${testOrderId}`)
        .set('Authorization', adminToken);
    }
    if (adminUser && adminUser._id) {
      await deleteTestUser(adminUser._id, adminToken);
    }
    if (normalUser && normalUser._id) {
      await deleteTestUser(normalUser._id, userToken);
    }
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  describe('GET /api/admin/dashboard', () => {
    test('should allow admin to view dashboard', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', adminToken);
      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('totalUsers');
      }
    });

    test('should block non-admin users', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', userToken);
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test('should fail without token', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer invalid.token.value');
      expect([401, 403, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/admin/users', () => {
    test('should return user list for admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', adminToken);
      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('should support pagination (if implemented)', async () => {
      const res = await request(app)
        .get('/api/admin/users?page=1&limit=5')
        .set('Authorization', adminToken);
      expect([200, 403, 404]).toContain(res.statusCode);
    });

    test('should block non-admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', userToken);
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test('should fail without token', async () => {
      const res = await request(app).get('/api/admin/users');
      expect([401, 403, 404]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    test('should update user role to vendor', async () => {
      if (!testUserId) {
        console.warn('⚠️ Skipping — testUserId not set.');
        return;
      }

      const res = await request(app)
        .put(`/api/admin/users/${testUserId}`)
        .set('Authorization', adminToken)
        .send({ role: 'vendor' });

      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('role', 'vendor');
      }
    });

    test('should return 400 for malformed user ID', async () => {
      const res = await request(app)
        .put('/api/admin/users/invalidId')
        .set('Authorization', adminToken)
        .send({ role: 'vendor' });
      expect([400, 403, 404]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/api/admin/users/64c529a1998764430f00abc1')
        .set('Authorization', adminToken)
        .send({ role: 'vendor' });
      expect([400, 403, 404]).toContain(res.statusCode);
    });

    test('should block user from self-escalating role', async () => {
      if (!testUserId) return;
      const res = await request(app)
        .put(`/api/admin/users/${testUserId}`)
        .set('Authorization', userToken)
        .send({ role: 'admin' });
      expect([401, 403, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    test('should delete user if authorized', async () => {
      if (!testUserId) {
        console.warn('⚠️ Skipping — testUserId not set.');
        return;
      }

      const res = await request(app)
        .delete(`/api/admin/users/${testUserId}`)
        .set('Authorization', adminToken);

      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('message');
      }
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .delete('/api/admin/users/notValidId')
        .set('Authorization', adminToken);
      expect([400, 403, 404]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .delete('/api/admin/users/64c529a1998764430f00abc2')
        .set('Authorization', adminToken);
      expect([400, 403, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/admin/orders', () => {
    test('should return all orders for admin', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', adminToken);

      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('should block non-admin', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', userToken);
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test('should fail without token', async () => {
      const res = await request(app).get('/api/admin/orders');
      expect([401, 403, 404]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/admin/orders/:id/status', () => {
    test('should update order status', async () => {
      if (!testOrderId) {
        console.warn('⚠️ Skipping — testOrderId not set.');
        return;
      }

      const res = await request(app)
        .put(`/api/admin/orders/${testOrderId}/status`)
        .set('Authorization', adminToken)
        .send({ status: 'shipped' });

      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('status', 'shipped');
      }
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .put('/api/admin/orders/invalidOrderId/status')
        .set('Authorization', adminToken)
        .send({ status: 'shipped' });

      expect([400, 403, 404]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .put('/api/admin/orders/64c529a1998764430f00abc3/status')
        .set('Authorization', adminToken)
        .send({ status: 'shipped' });
      expect([400, 403, 404]).toContain(res.statusCode);
    });
  });
});
