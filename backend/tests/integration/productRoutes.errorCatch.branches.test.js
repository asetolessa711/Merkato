const request = require('supertest');
const app = require('../../server');

describe('productRoutes error catch branches', () => {
  test('GET /api/products/:id with invalid id string yields 500 (CastError path tolerated)', async () => {
    const res = await request(app).get('/api/products/not-a-valid-objectid');
    expect([500, 400]).toContain(res.statusCode);
  });
});
