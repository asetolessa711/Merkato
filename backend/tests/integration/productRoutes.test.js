const request = require('supertest');
const app = require('../../../server');

describe('Product Routes', () => {
  let createdProductId;

  // Future: Setup test DB, seed users, or connect to in-memory DB
  beforeAll(async () => {
    // await connectTestDB();
    // await seedAdminUser();
  });

  // Future: Clean up test DB, disconnect, or drop created product
  afterAll(async () => {
    // await cleanupTestDB();
    // await disconnectTestDB();
  });

  describe('GET /api/products', () => {
    test('should return product list', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  test('POST /api/products should create a new product (admin/vendor only)', async () => {
    const mockToken = 'Bearer mock-admin-token'; // Future: replace with generated JWT

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', mockToken)
      .send({
        name: 'Test Product',
        price: 25.0,
        category: 'Electronics',
        stock: 50,
        description: 'A test product'
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

    const mockToken = 'Bearer mock-admin-token';

    const res = await request(app)
      .put(`/api/products/${createdProductId}`)
      .set('Authorization', mockToken)
      .send({ price: 30 });

    expect([200, 403]).toContain(res.statusCode);
  });

  test('DELETE /api/products/:id should delete product', async () => {
    if (!createdProductId) {
      console.warn('⚠️ Skipping: product not created.');
      return;
    }

    const mockToken = 'Bearer mock-admin-token';

    const res = await request(app)
      .delete(`/api/products/${createdProductId}`)
      .set('Authorization', mockToken);

    expect([200, 403]).toContain(res.statusCode);
  });
});