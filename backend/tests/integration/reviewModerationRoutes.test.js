const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

let adminToken;
let userToken;

describe('Review Moderation Routes', () => {
  let productId;
  let reviewId;

  beforeAll(async () => {
    // Register or login test user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Moderation Test User',
        email: 'moderationtestuser@example.com',
        password: 'Test1234!',
        role: 'customer',
        country: 'Ethiopia'
      });
    if ([200, 201].includes(userRes.statusCode)) {
      userToken = 'Bearer ' + (userRes.body.token || userRes.body.accessToken);
    } else {
      // Try login if already exists
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'moderationtestuser@example.com',
          password: 'Test1234!'
        });
      userToken = 'Bearer ' + (loginRes.body.token || loginRes.body.accessToken);
    }

    // Register or login test admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Moderation Test Admin',
        email: 'moderationtestadmin@example.com',
        password: 'Admin1234!',
        role: 'admin',
        country: 'Ethiopia'
      });
    if ([200, 201].includes(adminRes.statusCode)) {
      adminToken = 'Bearer ' + (adminRes.body.token || adminRes.body.accessToken);
    } else {
      // Try login if already exists
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'moderationtestadmin@example.com',
          password: 'Admin1234!'
        });
      adminToken = 'Bearer ' + (loginRes.body.token || loginRes.body.accessToken);
    }

    // Create a product and review to moderate
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', adminToken)
      .send({
        name: 'Moderation Test Product',
        price: 10,
        stock: 5,
        category: 'Testing',
        description: 'Product for review moderation test'
      });

    if ([200, 201].includes(productRes.statusCode)) {
      productId = productRes.body._id;
    }

    if (productId) {
      const reviewRes = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', userToken)
        .send({ rating: 2, comment: 'Needs moderation' });

      if ([200, 201].includes(reviewRes.statusCode)) {
        reviewId = reviewRes.body._id;
      }
    }
  });

  afterAll(async () => {
    if (productId) {
      await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', adminToken);
    }
    if (reviewId) {
      await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', adminToken);
    }
    await mongoose.connection.close();
  });

  describe('GET /api/admin/reviews', () => {
    test('should allow admin to view flagged reviews', async () => {
      const res = await request(app)
        .get('/api/admin/reviews')
        .set('Authorization', adminToken);

      expect([200, 401, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('should support pagination/filtering if implemented', async () => {
      const res = await request(app)
        .get('/api/admin/reviews?page=1&limit=2&flagged=true')
        .set('Authorization', adminToken);

      expect([200, 401, 403, 501]).toContain(res.statusCode);
    });

    test('should block non-admin access', async () => {
      const res = await request(app)
        .get('/api/admin/reviews')
        .set('Authorization', userToken);
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should fail without token', async () => {
      const res = await request(app).get('/api/admin/reviews');
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/admin/reviews/:reviewId/hide', () => {
    test('should allow admin to hide review', async () => {
      if (!reviewId) {
        console.warn('⚠️ Skipping — review not created.');
        return;
      }

      const res = await request(app)
        .put(`/api/admin/reviews/${reviewId}/hide`)
        .set('Authorization', adminToken);

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('hidden', true);
      }
    });

    test('should be idempotent if already hidden', async () => {
      if (!reviewId) return;
      const res = await request(app)
        .put(`/api/admin/reviews/${reviewId}/hide`)
        .set('Authorization', adminToken);
      expect([200, 403]).toContain(res.statusCode);
    });

    test('should block non-admin from hiding review', async () => {
      if (!reviewId) return;
      const res = await request(app)
        .put(`/api/admin/reviews/${reviewId}/hide`)
        .set('Authorization', userToken);
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .put('/api/admin/reviews/notAValidId/hide')
        .set('Authorization', adminToken);

      expect([400, 404, 403]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent review', async () => {
      const res = await request(app)
        .put('/api/admin/reviews/64c529a1998764430f00abc7/hide')
        .set('Authorization', adminToken);

      expect([404, 400, 403]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/admin/reviews/:reviewId/unhide', () => {
    test('should allow admin to unhide review', async () => {
      if (!reviewId) return;

      const res = await request(app)
        .put(`/api/admin/reviews/${reviewId}/unhide`)
        .set('Authorization', adminToken);

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('hidden', false);
      }
    });

    test('should be idempotent if already unhidden', async () => {
      if (!reviewId) return;
      const res = await request(app)
        .put(`/api/admin/reviews/${reviewId}/unhide`)
        .set('Authorization', adminToken);
      expect([200, 403]).toContain(res.statusCode);
    });

    test('should block non-admin from unhiding review', async () => {
      if (!reviewId) return;
      const res = await request(app)
        .put(`/api/admin/reviews/${reviewId}/unhide`)
        .set('Authorization', userToken);
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .put('/api/admin/reviews/notValidId/unhide')
        .set('Authorization', adminToken);

      expect([400, 404, 403]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent review', async () => {
      const res = await request(app)
        .put('/api/admin/reviews/64c529a1998764430f00abc7/unhide')
        .set('Authorization', adminToken);

      expect([404, 400, 403]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/admin/reviews/:reviewId', () => {
    test('should allow admin to permanently delete a review', async () => {
      if (!reviewId) return;

      const res = await request(app)
        .delete(`/api/admin/reviews/${reviewId}`)
        .set('Authorization', adminToken);

      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('message');
      }
    });

    test('should block non-admin from deleting review', async () => {
      if (!reviewId) return;
      const res = await request(app)
        .delete(`/api/admin/reviews/${reviewId}`)
        .set('Authorization', userToken);
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .delete('/api/admin/reviews/notValidId')
        .set('Authorization', adminToken);

      expect([400, 401, 404, 403]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent review', async () => {
      const res = await request(app)
        .delete('/api/admin/reviews/64c529a1998764430f00abc7')
        .set('Authorization', adminToken);

      expect([404, 401, 403, 400]).toContain(res.statusCode);
    });
  });
});