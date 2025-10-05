const request = require('supertest');
const app = require('../../server');
const Product = require('../../models/Product');
const DeliverySettings = require('../../models/DeliverySettings');

describe('productRoutes error paths (coverage)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('GET /api/products handles DB errors with 500', async () => {
    jest.spyOn(Product, 'find').mockRejectedValueOnce(new Error('DB down'));
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('message');
  });

  test('GET /api/products/delivery-settings handles errors with 500', async () => {
    jest.spyOn(DeliverySettings, 'findOne').mockRejectedValueOnce(new Error('boom'));
    const res = await request(app).get('/api/products/delivery-settings');
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('message');
  });
});
