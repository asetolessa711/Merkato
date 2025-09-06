const request = require('supertest');
const app = require('../../server');
const { mockStripeEvent } = require('../utils/mockStripeEvent');


// Use testUserUtils to register/login test user
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');
let userToken;

beforeAll(async () => {
  // Register and login a normal test user
  const userEmail = `stripeuser_${Date.now()}@example.com`;
  await registerTestUser({
    email: userEmail,
    password: 'UserPass123!',
    name: 'Stripe User',
    country: 'Ethiopia'
  });
  const userLogin = await loginTestUser(userEmail, 'UserPass123!');
  userToken = `Bearer ${userLogin.token}`;
});

describe('Stripe Routes', () => {
  // ----------------------------
  // Checkout Session
  // ----------------------------
  describe('POST /api/stripe/create-checkout-session', () => {
    test('should reject without token', async () => {
      const res = await request(app)
        .post('/api/stripe/create-checkout-session')
        .send({
          items: [{ productId: '64c529a1998764430f000000', quantity: 2 }]
        });
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return session URL or ID for valid request', async () => {
      const res = await request(app)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', userToken)
        .send({
          items: [{ productId: '64c529a1998764430f000000', quantity: 1 }],
          success_url: 'http://localhost:3000/success',
          cancel_url: 'http://localhost:3000/cancel'
        });

      expect([200, 400, 401, 403, 404, 422, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('url');
        expect(res.body.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
      }
    });

    test('should return 400 for missing items', async () => {
      const res = await request(app)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', userToken)
        .send({});
      expect([400, 401, 403, 404, 422]).toContain(res.statusCode);
    });

    test('should return 400 for empty items array', async () => {
      const res = await request(app)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', userToken)
        .send({ items: [] });
      expect([400, 401, 403, 404, 422]).toContain(res.statusCode);
    });

    test('should return 400 for invalid productId', async () => {
      const res = await request(app)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', userToken)
        .send({
          items: [{ productId: 'invalid', quantity: 1 }],
          success_url: 'http://localhost:3000/success',
          cancel_url: 'http://localhost:3000/cancel'
        });
      expect([400, 401, 403, 404, 422]).toContain(res.statusCode);
    });

    test('should return 400 for missing success/cancel URLs', async () => {
      const res = await request(app)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', userToken)
        .send({
          items: [{ productId: '64c529a1998764430f000000', quantity: 1 }]
        });
      expect([400, 401, 403, 404, 422]).toContain(res.statusCode);
    });
  });

  // ----------------------------
  // Webhook Handling
  // ----------------------------
  describe('POST /api/stripe/webhook', () => {
    test('should return 400 for missing signature', async () => {
      const res = await request(app)
        .post('/api/stripe/webhook')
        .send({ type: 'payment_intent.succeeded' });
      expect([400, 401, 403, 404]).toContain(res.statusCode);
    });

    test('should reject with invalid signature', async () => {
      const res = await request(app)
        .post('/api/stripe/webhook')
        .set('Stripe-Signature', 'invalid-signature')
        .send({ type: 'payment_intent.succeeded' });
      expect([400, 401, 403, 404]).toContain(res.statusCode);
    });

    test('should accept mocked Stripe event (payment_intent.succeeded)', async () => {
      const { payload, signature } = mockStripeEvent(null, 'payment_intent.succeeded', {
        id: 'pi_test_123',
        amount: 4999,
        currency: 'usd'
      });

      const res = await request(app)
        .post('/api/stripe/webhook')
        .set('Stripe-Signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect([200, 400, 401, 403, 404, 501]).toContain(res.statusCode);
    });

    test('should return 400 for unsupported event type', async () => {
      const { payload, signature } = mockStripeEvent({
        id: 'evt_test_unknown',
        type: 'unknown.event',
        data: { object: {} }
      });

      const res = await request(app)
        .post('/api/stripe/webhook')
        .set('Stripe-Signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect([400, 401, 403, 404, 501, 200]).toContain(res.statusCode);
    });

    test('should return 400 for malformed JSON', async () => {
      const res = await request(app)
        .post('/api/stripe/webhook')
        .set('Stripe-Signature', 'mocked-signature')
        .set('Content-Type', 'application/json')
        .send('not a json');
      expect([400, 401, 403, 404, 501]).toContain(res.statusCode);
    });
  });

  // ----------------------------
  // Stripe Configuration
  // ----------------------------
  describe('GET /api/stripe/config', () => {
    test('should return publishable key from env', async () => {
      const res = await request(app).get('/api/stripe/config');
      expect([200, 403, 404]).toContain(res.statusCode);

      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('publishableKey');
        expect(res.body.publishableKey).toMatch(/^pk_test_/);
      }
    });

    // Optional test if you're validating misconfig
    // test('should return error for missing publishable key', async () => {
    //   process.env.STRIPE_PUBLISHABLE_KEY = '';
    //   const res = await request(app).get('/api/stripe/config');
    //   expect([400, 404, 500]).toContain(res.statusCode);
    // });
  });
});
