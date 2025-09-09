jest.setTimeout(20000);
const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

/**
 * Contract tests to lock core public API shapes that frontend/e2e rely on.
 * - GET /api (health)
 * - GET /api/products/delivery-settings
 * - GET /api/feature-flags
 */
describe('Public API contracts', () => {
  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('GET /api returns backend health payload', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(typeof res.body.message).toBe('string');
  });

  test('GET /api/products/delivery-settings returns defaults and options', async () => {
    const res = await request(app).get('/api/products/delivery-settings');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('defaultEtaDays');
    expect(res.body).toHaveProperty('defaultEtaNote');
    expect(res.body).toHaveProperty('shippingOptions');
    expect(Array.isArray(res.body.shippingOptions)).toBe(true);
  });

  test('GET /api/feature-flags exposes conservative booleans', async () => {
    const res = await request(app).get('/api/feature-flags');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('flags');
    expect(res.body.flags).toHaveProperty('gamification');
    expect(res.body.flags).toHaveProperty('behavioralPromos');
    expect(typeof res.body.flags.gamification).toBe('boolean');
    expect(typeof res.body.flags.behavioralPromos).toBe('boolean');
  });
});
