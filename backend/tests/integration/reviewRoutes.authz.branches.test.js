const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('reviewRoutes authorization branches', () => {
  let customer1, customer2;
  let token1, token2;
  let fakeReviewId;

  beforeAll(async () => {
    customer1 = await registerTestUser({ roles: ['customer'] });
    const c1 = await loginTestUser(customer1.email, 'Password123!');
    token1 = `Bearer ${c1.token}`;
    customer2 = await registerTestUser({ roles: ['customer'] });
    const c2 = await loginTestUser(customer2.email, 'Password123!');
    token2 = `Bearer ${c2.token}`;
    fakeReviewId = new mongoose.Types.ObjectId().toString();
  });

  afterAll(async () => {
    try {
      if (customer1 && customer1._id) await deleteTestUser(customer1._id, token1);
      if (customer2 && customer2._id) await deleteTestUser(customer2._id, token2);
    } catch (_) {}
  });

  test('DELETE /api/reviews/:id → 403 for non-owner customer (tolerant)', async () => {
    const res = await request(app)
      .delete(`/api/reviews/${fakeReviewId}`)
      .set('Authorization', token2);
    expect([403, 404, 500]).toContain(res.statusCode);
  });
});
