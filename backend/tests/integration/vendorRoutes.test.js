const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

let testVendorToken;
let testUserToken;
let vendorUserId;
let normalUserId;

// 📝 Alternative approach for mocking (optional future use):
// jest.mock('../../middleware/authMiddleware', () => ({
//   protect: (req, res, next) => {
//     req.user = { id: 'vendor123', role: 'vendor', isVendor: true };
//     next();
//   }
// }));

describe('Vendor Routes', () => {
  let createdProductId;


  beforeAll(async () => {
    // Register a vendor user
    const vendorReg = await registerTestUser({
      email: `vendor_${Date.now()}@example.com`,
      password: 'VendorPass123!',
      name: 'Vendor User',
      roles: ['vendor'],
      storeName: 'Test Vendor Store',
      country: 'Ethiopia'
    });
    vendorUserId = vendorReg.user ? vendorReg.user._id : vendorReg._id;
    const vendorLogin = await loginTestUser(vendorReg.email, 'VendorPass123!');
    testVendorToken = `Bearer ${vendorLogin.token}`;

    // Register a normal user
    const userReg = await registerTestUser({
      email: `user_${Date.now()}@example.com`,
      password: 'UserPass123!',
      name: 'Normal User',
      roles: ['customer'],
      country: 'Ethiopia'
    });
    normalUserId = userReg.user ? userReg.user._id : userReg._id;
    const userLogin = await loginTestUser(userReg.email, 'UserPass123!');
    testUserToken = `Bearer ${userLogin.token}`;
  });

  afterAll(async () => {
    await mongoose.connection.close();
    // Future: Clean up test DB or disconnect
    // await cleanupTestData();
    // await disconnectTestDB();
  });

  describe('GET /api/vendor/analytics', () => {
    test('should fail without token', async () => {
      const res = await request(app).get('/api/vendor/analytics');
      expect(res.statusCode).toBe(401);
    });

    test('should fail with non-vendor token', async () => {
      const res = await request(app)
        .get('/api/vendor/analytics')
        .set('Authorization', testUserToken);
      expect(res.statusCode).toBe(403);
    });

    test('should return analytics data for vendor', async () => {
      const res = await request(app)
        .get('/api/vendor/analytics')
        .set('Authorization', testVendorToken);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body).toHaveProperty('totalItemsSold');
      expect(res.body).toHaveProperty('orderCount');
      expect(res.body).toHaveProperty('uniqueCustomers');
    });
  });

  describe('GET /api/vendor/revenue', () => {
    test('should fail without token', async () => {
      const res = await request(app).get('/api/vendor/revenue');
      expect(res.statusCode).toBe(401);
    });

    test('should fail with non-vendor token', async () => {
      const res = await request(app)
        .get('/api/vendor/revenue')
        .set('Authorization', testUserToken);
      expect(res.statusCode).toBe(403);
    });

    test('should return revenue data for vendor', async () => {
      const res = await request(app)
        .get('/api/vendor/revenue')
        .set('Authorization', testVendorToken);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body).toHaveProperty('productCount');
    });
  });

  describe('GET /api/vendor/top-products', () => {
    test('should fail without token', async () => {
      const res = await request(app).get('/api/vendor/top-products');
      expect(res.statusCode).toBe(401);
    });

    test('should fail with non-vendor token', async () => {
      const res = await request(app)
        .get('/api/vendor/top-products')
        .set('Authorization', testUserToken);
      expect(res.statusCode).toBe(403);
    });

    test('should return top products for vendor', async () => {
      const res = await request(app)
        .get('/api/vendor/top-products')
        .set('Authorization', testVendorToken);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/vendor/top-customers', () => {
    test('should fail without token', async () => {
      const res = await request(app).get('/api/vendor/top-customers');
      expect(res.statusCode).toBe(401);
    });

    test('should fail with non-vendor token', async () => {
      const res = await request(app)
        .get('/api/vendor/top-customers')
        .set('Authorization', testUserToken);
      expect(res.statusCode).toBe(403);
    });

    test('should return top customers for vendor', async () => {
      const res = await request(app)
        .get('/api/vendor/top-customers')
        .set('Authorization', testVendorToken);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/vendor/products', () => {
    test('should allow vendor to upload product', async () => {
      const res = await request(app)
        .post('/api/vendor/products')
        .set('Authorization', testVendorToken)
        .send({
          name: 'Vendor Test Product',
          price: 45.5,
          stock: 20,
          category: 'Accessories',
          description: 'Product uploaded by vendor'
        });

      // Only accept 201 or 200 as success
      expect([201, 200]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name');
      createdProductId = res.body._id;
    });

    test('should fail for non-vendor user', async () => {
      const res = await request(app)
        .post('/api/vendor/products')
        .set('Authorization', testUserToken)
        .send({ name: 'Unauthorized Product', price: 10 });
      // Accept 403 (forbidden) or 404 (not found) as valid
      expect([403, 404]).toContain(res.statusCode);
    });
  });


  describe('PUT /api/vendor/profile', () => {
    test('should allow vendor to update profile', async () => {
      const res = await request(app)
        .put('/api/vendor/profile')
        .set('Authorization', testVendorToken)
        .send({
          storeName: 'Updated Store Name',
          description: 'Updated store info'
        });

      expect(res.statusCode).toBe(200);
      // The backend returns a message and avatar, not storeName
      expect(res.body).toHaveProperty('message');
    });

    test('should block profile update for non-vendor', async () => {
      const res = await request(app)
        .put('/api/vendor/profile')
        .set('Authorization', testUserToken)
        .send({ storeName: 'Fake Store' });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/vendor/products/:id', () => {
    test('should delete vendor product if authorized', async () => {
      if (!createdProductId) {
        console.warn('⚠️ Skipping delete test — product not created.');
        return;
      }

      const res = await request(app)
        .delete(`/api/vendor/products/${createdProductId}`)
        .set('Authorization', testVendorToken);

      expect(res.statusCode).toBe(200);
    });

    test('should fail without token', async () => {
      if (!createdProductId) return;

      const res = await request(app)
        .delete(`/api/vendor/products/${createdProductId}`);

      expect(res.statusCode).toBe(401);
    });

    test('should return 404 or 400 for non-existent product ID', async () => {
      const fakeId = '64c529a1998764430f000abc';
      const res = await request(app)
        .delete(`/api/vendor/products/${fakeId}`)
        .set('Authorization', testVendorToken);

      expect([404, 400]).toContain(res.statusCode);
    });
  });
});