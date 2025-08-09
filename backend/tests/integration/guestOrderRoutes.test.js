const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');
const Product = require('../../models/Product');

// Helper to find or create a simple in-stock product
async function ensureTestProduct() {
  let product = await Product.findOne({ stock: { $gte: 1 } });
  if (product) return product._id;
  // Create a minimal vendor and product via direct model usage
  const User = require('../../models/User');
  const vendor = await User.create({
    name: `Guest Vendor ${Date.now()}`,
    email: `guest-vendor-${Date.now()}@example.com`,
    password: 'Password123!',
    roles: ['vendor'],
    country: 'ET'
  });
  const created = await Product.create({
    name: `Guest Order Test Product ${Date.now()}`,
    price: 9.99,
    stock: 10,
    description: 'For guest order route tests',
    category: 'test',
    vendor: vendor._id
  });
  return created._id;
}

describe('Guest Order Routes', () => {
  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('POST /api/orders/guest should create order with valid guest payload (happy path)', async () => {
    const productId = await ensureTestProduct();

    const res = await request(app)
      .post('/api/orders/guest')
      .send({
        email: `guest-${Date.now()}@example.com`,
        fullName: 'Guest Buyer',
        cartItems: [{ product: productId.toString(), quantity: 1 }],
        shippingAddress: {
          fullName: 'Guest Buyer',
          city: 'Addis Ababa',
          country: 'ET'
        },
        paymentMethod: 'cod',
        deliveryOption: { name: 'Standard', cost: 5, days: 3 }
      });

    expect([201, 200]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('order');
    expect(res.body.order).toHaveProperty('_id');
  });

  test('POST /api/orders/guest should return 400 for invalid email', async () => {
    const productId = await ensureTestProduct();

    const res = await request(app)
      .post('/api/orders/guest')
      .send({
        email: 'not-an-email',
        fullName: 'Guest Buyer',
        cartItems: [{ product: productId.toString(), quantity: 1 }],
        shippingAddress: { fullName: 'Guest Buyer', city: 'Addis Ababa', country: 'ET' },
        paymentMethod: 'cod',
        deliveryOption: { name: 'Standard', cost: 5, days: 3 }
      });

    expect(res.statusCode).toBe(400);
  });
});
