const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');
const Product = require('../../models/Product');

describe('Stripe Routes branch coverage @stripe', () => {
  let customerToken;
  let productId;
  let vendorId;

  beforeAll(async () => {
    // Create a vendor to satisfy Product.vendor requirement
    const vendor = await registerTestUser({
      email: `stripe_vendor_${Date.now()}@example.com`,
      password: 'VendorPass123!',
      roles: ['vendor'],
      storeName: 'Stripe Vendor'
    });
    vendorId = (vendor.user && vendor.user._id) || vendor._id;

    // Seed a product directly with required vendor field to avoid route dependencies
    const p = await Product.create({
      name: `Stripe Test ${Date.now()}`,
      price: 12.34,
      currency: 'USD',
      stock: 10,
      category: 'Test',
      vendor: vendorId
    });
    productId = p._id.toString();

    const user = await registerTestUser({
      email: `stripe_customer_${Date.now()}@example.com`,
      password: 'Password123!',
      roles: ['customer']
    });
    const login = await loginTestUser(user.email, 'Password123!');
    customerToken = `Bearer ${login.token}`;
  });

  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  describe('POST /api/stripe/webhook', () => {
    test('400 when missing signature', async () => {
      const res = await request(app)
        .post('/api/stripe/webhook')
        .send({ type: 'payment_intent.succeeded', id: 'evt_1' });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Missing Stripe-Signature/);
    });

    test('400 when invalid signature format', async () => {
      const res = await request(app)
        .post('/api/stripe/webhook')
        .set('Stripe-Signature', 'bad-signature')
        .send({ type: 'payment_intent.succeeded', id: 'evt_2' });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Invalid signature/);
    });

    test('400 when malformed event body', async () => {
      const res = await request(app)
        .post('/api/stripe/webhook')
        .set('Stripe-Signature', 't=12345, v1=abc')
        .send({ notype: true });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Malformed event/);
    });

    test('200 when supported event and idempotent handling', async () => {
      const payload = { type: 'checkout.session.completed', id: 'evt_ok_1' };
      const sig = 't=12345, v1=abc';
      const first = await request(app).post('/api/stripe/webhook').set('Stripe-Signature', sig).send(payload);
      expect(first.statusCode).toBe(200);
      const second = await request(app).post('/api/stripe/webhook').set('Stripe-Signature', sig).send(payload);
      expect(second.statusCode).toBe(200);
      expect(second.body.duplicate).toBe(true);
    });

    test('400 on unsupported event type', async () => {
      const res = await request(app)
        .post('/api/stripe/webhook')
        .set('Stripe-Signature', 't=1, v1=x')
        .send({ type: 'unknown.event', id: 'evt_unknown' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/stripe/create-checkout-session', () => {
    test('401 without token', async () => {
      const res = await request(app)
        .post('/api/stripe/create-checkout-session')
        .send({ productId, quantity: 1 });
      expect(res.statusCode).toBe(401);
    });

    test('404 when product not found', async () => {
      const res = await request(app)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', customerToken)
        .send({ productId: '000000000000000000000000', quantity: 1 });
      expect(res.statusCode).toBe(404);
    });

    test('200 when valid request with test stripe client', async () => {
      const res = await request(app)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', customerToken)
        .send({ productId, quantity: 1 });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
    });
  });
});
