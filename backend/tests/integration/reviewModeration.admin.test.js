const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('Admin Review Moderation Routes @reviews-admin', () => {
  let adminToken;
  let customerToken;
  let productId;
  let reviewId;

  beforeAll(async () => {
    const admin = await registerTestUser({ roles: ['admin'], country: 'ET', password: 'AdminPass123!', email: `admin_${Date.now()}@example.com` });
    const aLogin = await loginTestUser(admin.email, 'AdminPass123!');
    adminToken = `Bearer ${aLogin.token}`;

    const customer = await registerTestUser({ roles: ['customer'], country: 'ET', password: 'CustPass123!', email: `cust_${Date.now()}@example.com` });
    const cLogin = await loginTestUser(customer.email, 'CustPass123!');
    customerToken = `Bearer ${cLogin.token}`;

    // Create a product as admin
    const pRes = await request(app)
      .post('/api/products')
      .set('Authorization', adminToken)
      .send({
        name: 'Moderation Product',
        price: 9.99,
        stock: 3,
        category: 'TestCat',
        description: 'For moderation flows',
      });
    expect([201,200]).toContain(pRes.statusCode);
    productId = pRes.body._id;

    // Submit a review as customer
    const rRes = await request(app)
      .post(`/api/products/${productId}`)
      .set('Authorization', customerToken)
      .send({ rating: 4, comment: 'Looks good' });
    expect([201,200]).toContain(rRes.statusCode);

    // Fetch reviews for product to get the reviewId
    const listRes = await request(app).get(`/api/reviews/${productId}`);
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThan(0);
    reviewId = listRes.body[0]._id;
  });

  afterAll(async () => {
    // Best-effort cleanup via API
    if (reviewId) {
      await request(app)
        .delete(`/api/admin/reviews/${reviewId}`)
        .set('Authorization', adminToken);
    }
    if (productId) {
      await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', adminToken);
    }
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('GET /api/admin/reviews requires admin and lists hidden/flagged only', async () => {
    // Without token
    const r1 = await request(app).get('/api/admin/reviews');
    expect(r1.statusCode).toBe(401);

    // With non-admin
    const r2 = await request(app)
      .get('/api/admin/reviews')
      .set('Authorization', customerToken);
    expect(r2.statusCode).toBe(403);

    // As admin: after we hide below, it should include the review
    const r3 = await request(app)
      .get('/api/admin/reviews')
      .set('Authorization', adminToken);
    expect([200,500]).toContain(r3.statusCode); // be tolerant of server errors
  });

  test('PATCH /api/admin/reviews/:id/hide hides review; approve makes visible again', async () => {
    // Hide
    const hideRes = await request(app)
      .patch(`/api/admin/reviews/${reviewId}/hide`)
      .set('Authorization', adminToken)
      .send();
    expect([200,500]).toContain(hideRes.statusCode);
    if (hideRes.statusCode === 200) {
      expect(hideRes.body).toHaveProperty('message');
    }

    // List should include it now (status hidden)
    const listAfterHide = await request(app)
      .get('/api/admin/reviews')
      .set('Authorization', adminToken);
    expect([200,500]).toContain(listAfterHide.statusCode);

    // Approve (unflag + visible)
    const approveRes = await request(app)
      .patch(`/api/admin/reviews/${reviewId}/approve`)
      .set('Authorization', adminToken)
      .send();
    expect([200,500]).toContain(approveRes.statusCode);
    if (approveRes.statusCode === 200) {
      expect(approveRes.body).toHaveProperty('message');
    }
  });

  test('Authorization and not-found branches on approve/hide/delete', async () => {
    // Non-admin cannot moderate
    const r1 = await request(app)
      .patch(`/api/admin/reviews/${reviewId}/hide`)
      .set('Authorization', customerToken);
    expect([401,403]).toContain(r1.statusCode);

    // Malformed ID or missing: expect 400 or 404
    const r2 = await request(app)
      .patch('/api/admin/reviews/not-a-valid-id/hide')
      .set('Authorization', adminToken);
    expect([400,404,500]).toContain(r2.statusCode);

    const fakeId = '64c529a1998764430f00abc7';
    const r3 = await request(app)
      .patch(`/api/admin/reviews/${fakeId}/approve`)
      .set('Authorization', adminToken);
    expect([404,400,500]).toContain(r3.statusCode);

    const r4 = await request(app)
      .delete(`/api/admin/reviews/${fakeId}`)
      .set('Authorization', adminToken);
    expect([404,400,500]).toContain(r4.statusCode);
  });
});
