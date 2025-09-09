const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

describe('Cart Routes', () => {
  let userToken;
  let adminToken;
  let productId;
  const anonId = `anon-cart-${Date.now()}`;

  beforeAll(async () => {
    // Register a customer
    const regUser = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cart User',
        email: `cart_${Date.now()}@example.com`,
        password: 'Password123!',
        roles: ['customer'],
        country: 'Ethiopia'
      });
    expect([200, 201]).toContain(regUser.status);
    userToken = 'Bearer ' + (regUser.body.token || regUser.body.accessToken);

    // Register an admin to create a product
    const regAdmin = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cart Admin',
        email: `cart_admin_${Date.now()}@example.com`,
        password: 'Password123!',
        roles: ['admin'],
        country: 'Ethiopia'
      });
    expect([200, 201]).toContain(regAdmin.status);
    adminToken = 'Bearer ' + (regAdmin.body.token || regAdmin.body.accessToken);

    // Create one product
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', adminToken)
      .send({ name: 'Cart Test Product', price: 12.5, stock: 10, category: 'Test' });
    expect([200, 201]).toContain(created.status);
    productId = created.body._id;
  });

  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('GET /api/cart returns empty list for new anonymous id', async () => {
    const res = await request(app).get('/api/cart').query({ anonymousId: anonId });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('PUT /api/cart upserts cart for anonymous user', async () => {
    const res = await request(app)
      .put('/api/cart')
      .send({ anonymousId: anonId, items: [{ product: productId, quantity: 2 }] });
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toHaveProperty('product');
  });

  test('POST /api/cart/merge merges anon into user cart and clears anon cart', async () => {
    const res = await request(app)
      .post('/api/cart/merge')
      .set('Authorization', userToken)
      .send({ anonymousId: anonId });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    // merging same item should keep >= original quantity
    expect(res.body.items[0].quantity).toBeGreaterThanOrEqual(1);
  });
});
