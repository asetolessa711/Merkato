const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('Favorite Routes (coverage uplift)', () => {
  let vendorToken;
  let customerToken;
  let createdProductId;

  beforeAll(async () => {
    // Create a vendor and a product
    const vendor = await registerTestUser({ roles: ['vendor'], name: 'Fav Vendor' });
    const vendorLogin = await loginTestUser(vendor.email, 'Password123!');
    vendorToken = `Bearer ${vendorLogin.token}`;

    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', vendorToken)
      .send({
        name: 'Fav Product',
        description: 'To be favorited',
        price: 9.99,
        stock: 5,
        category: 'General'
      });
    expect([201, 200]).toContain(prodRes.statusCode);
    createdProductId = prodRes.body._id || prodRes.body.id;

    // Create a customer
    const customer = await registerTestUser({ roles: ['customer'], name: 'Fav Customer' });
    const customerLogin = await loginTestUser(customer.email, 'Password123!');
    customerToken = `Bearer ${customerLogin.token}`;
  });

  test('GET /api/favorites requires auth', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.statusCode).toBe(401);
  });

  test('workflow: empty -> save -> duplicate -> list -> delete -> empty', async () => {
    // Initially empty
    let res = await request(app)
      .get('/api/favorites')
      .set('Authorization', customerToken);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);

    // Save product
    res = await request(app)
      .post(`/api/favorites/${createdProductId}`)
      .set('Authorization', customerToken);
    expect([200, 201]).toContain(res.statusCode);
    // The route returns 201 on first save, 200 when already saved

    // Duplicate save is idempotent
    res = await request(app)
      .post(`/api/favorites/${createdProductId}`)
      .set('Authorization', customerToken);
    expect(res.statusCode).toBe(200);
    expect(res.body && res.body.message).toBeDefined();

    // List should contain product objects (populated)
    res = await request(app)
      .get('/api/favorites')
      .set('Authorization', customerToken);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    const prod = res.body[0];
    expect(prod && (prod._id || prod.id)).toBeDefined();

    // Delete
    res = await request(app)
      .delete(`/api/favorites/${createdProductId}`)
      .set('Authorization', customerToken);
    expect(res.statusCode).toBe(200);

    // Back to empty
    res = await request(app)
      .get('/api/favorites')
      .set('Authorization', customerToken);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(0);
  });
});
