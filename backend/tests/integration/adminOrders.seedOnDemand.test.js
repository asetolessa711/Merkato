jest.setTimeout(30000);
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');
const Order = require('../../models/Order');
const Product = require('../../models/Product');

describe('Admin Orders GET (seed-on-demand)', () => {
  let adminToken;
  let vendorId;

  beforeAll(async () => {
    // Admin auth
    const admin = await registerTestUser({ roles: ['admin'], country: 'ET' });
    const adminLogin = await loginTestUser(admin.email, 'Password123!');
    adminToken = `Bearer ${adminLogin.token}`;

    // Ensure no orders so the route takes the seed-on-demand path
    await Order.deleteMany({});

    // Create a vendor and at least one product, so the route can construct a minimal order
    const vendor = await registerTestUser({ roles: ['vendor'], country: 'ET' });
    vendorId = vendor._id || vendor.id;

    // If no products exist yet, create one tied to the vendor
    const anyProduct = await Product.findOne();
    if (!anyProduct) {
      await Product.create({
        name: 'SeedOnDemand Product',
        price: 15,
        stock: 3,
        description: 'Product to enable seed-on-demand orders',
        category: 'Test',
        brand: 'TestBrand',
        vendor: vendorId,
      });
    }
  });

  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('GET /api/admin/orders returns array and triggers minimal order creation when none exist', async () => {
    const res = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', adminToken);

    expect([200]).toContain(res.statusCode);
    expect(Array.isArray(res.body)).toBe(true);
    // Expect at least one order now
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const o = res.body[0];
    // Basic shape checks — route returns lean() docs
    expect(o).toHaveProperty('_id');
    expect(o).toHaveProperty('total');
    expect(o).toHaveProperty('status');
  });
});
