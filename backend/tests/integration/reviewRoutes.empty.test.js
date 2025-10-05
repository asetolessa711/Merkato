const request = require('supertest');
const mongoose = require('mongoose');
let app = require('../../server');

describe('reviewRoutes empty list', () => {
  test('GET /api/reviews/:productId for product with no reviews -> 200 []', async () => {
    const fakeProductId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/reviews/${fakeProductId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length === 0 || res.body.filter(Boolean).length === 0).toBe(true);
  });
});
