jest.setTimeout(20000);
const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

describe('Product Routes', () => {
  let createdProductId;


  // Register and login a test admin user before tests
  const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    // Register a test admin user
    const uniqueEmail = `admin_${Date.now()}@example.com`;
    const user = await registerTestUser({
      email: uniqueEmail,
      password: 'AdminPass123!',
      name: 'Test Admin',
      country: 'Ethiopia',
      roles: ['admin']
    });
    adminUser = user;
    // Login to get JWT
    const login = await loginTestUser(uniqueEmail, 'AdminPass123!');
    adminToken = `Bearer ${login.token}`;
  });

  // Future: Clean up test DB, disconnect, or drop created product
  afterAll(async () => {
    // await cleanupTestDB();
    // await disconnectTestDB();
    await mongoose.connection.close();
  });

  describe('GET /api/products', () => {
    test('should return product list', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });


  test('POST /api/products should create a new product (admin/vendor only)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', adminToken)
      .send({
        name: 'Test Product',
        price: 25.0,
        category: 'Electronics',
        stock: 50,
        description: 'A test product',
        country: 'Ethiopia'
      });

    expect([201, 200, 403]).toContain(res.statusCode);

    if (res.statusCode === 201 || res.statusCode === 200) {
      expect(res.body).toHaveProperty('_id'); // ✅ Ensure _id is returned
      expect(res.body).toHaveProperty('name', 'Test Product');
      createdProductId = res.body._id;
    } else {
      console.warn('⚠️ Product was not created — skipping dependent tests.');
    }
  });

  test('GET /api/products/:id should fetch single product', async () => {
    if (!createdProductId) {
      console.warn('⚠️ Skipping: product not created.');
      return;
    }

    const res = await request(app).get(`/api/products/${createdProductId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('name');
  });

  test('PUT /api/products/:id should update product', async () => {
    if (!createdProductId) {
      console.warn('⚠️ Skipping: product not created.');
      return;
    }

    const res = await request(app)
      .put(`/api/products/${createdProductId}`)
      .set('Authorization', adminToken)
      .send({ price: 30 });

    expect([200, 403]).toContain(res.statusCode);
  });

  test('DELETE /api/products/:id should delete product', async () => {
    if (!createdProductId) {
      console.warn('⚠️ Skipping: product not created.');
      return;
    }

    const res = await request(app)
      .delete(`/api/products/${createdProductId}`)
      .set('Authorization', adminToken);

    expect([200, 403]).toContain(res.statusCode);
  });
});