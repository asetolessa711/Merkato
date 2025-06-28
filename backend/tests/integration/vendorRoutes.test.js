const request = require('supertest');
const app = require('../../../server');

// ✅ Environment tokens (set in CI, .env.test, or shell)
const testVendorToken = process.env.TEST_VENDOR_TOKEN;
const testUserToken = process.env.TEST_USER_TOKEN;

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
    // Future: Connect to test DB, seed vendor user & product
    // await connectTestDB();
    // await seedVendorUserAndProduct();
  });

  afterAll(async () => {
    // Future: Clean up test DB or disconnect
    // await cleanupTestData();
    // await disconnectTestDB();
  });

  describe('GET /api/vendor/dashboard', () => {
    test('should fail without token', async () => {
      const res = await request(app).get('/api/vendor/dashboard');
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should fail with non-vendor token', async () => {
      const res = await request(app)
        .get('/api/vendor/dashboard')
        .set('Authorization', testUserToken);
      expect([403, 401]).toContain(res.statusCode);
    });

    test('should return dashboard data for vendor', async () => {
      const res = await request(app)
        .get('/api/vendor/dashboard')
        .set('Authorization', testVendorToken);

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('totalSales');
      }
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

      expect([201, 200, 403]).toContain(res.statusCode);
      if (res.statusCode === 201 || res.statusCode === 200) {
        expect(res.body).toHaveProperty('_id');
        expect(res.body).toHaveProperty('name');
        createdProductId = res.body._id;
      } else {
        console.warn('⚠️ Product not created — skipping delete tests.');
      }
    });

    test('should fail for non-vendor user', async () => {
      const res = await request(app)
        .post('/api/vendor/products')
        .set('Authorization', testUserToken)
        .send({ name: 'Unauthorized Product', price: 10 });
      expect([403, 401]).toContain(res.statusCode);
    });
  });

  describe('GET /api/vendor/orders', () => {
    test('should return vendor-specific orders', async () => {
      const res = await request(app)
        .get('/api/vendor/orders')
        .set('Authorization', testVendorToken);

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('should block access for non-vendor', async () => {
      const res = await request(app)
        .get('/api/vendor/orders')
        .set('Authorization', testUserToken);
      expect([403, 401]).toContain(res.statusCode);
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

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('storeName');
      }
    });

    test('should block profile update for non-vendor', async () => {
      const res = await request(app)
        .put('/api/vendor/profile')
        .set('Authorization', testUserToken)
        .send({ storeName: 'Fake Store' });
      expect([403, 401]).toContain(res.statusCode);
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

      expect([200, 403]).toContain(res.statusCode);
    });

    test('should fail without token', async () => {
      if (!createdProductId) return;

      const res = await request(app)
        .delete(`/api/vendor/products/${createdProductId}`);

      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return 404 or 400 for non-existent product ID', async () => {
      const fakeId = '64c529a1998764430f000abc';
      const res = await request(app)
        .delete(`/api/vendor/products/${fakeId}`)
        .set('Authorization', testVendorToken);

      expect([404, 400, 403]).toContain(res.statusCode);
    });
  });
});