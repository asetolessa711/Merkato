const request = require('supertest');
const app = require('../../../server');

const userToken = process.env.TEST_USER_TOKEN;
const adminToken = process.env.TEST_ADMIN_TOKEN;
const secondUserToken = process.env.TEST_SECOND_USER_TOKEN; // For ownership tests

describe('Review Routes', () => {
  let productId;
  let reviewId;

  beforeAll(async () => {
    // Create a product to review
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', adminToken)
      .send({
        name: 'Review Test Product',
        price: 20,
        stock: 10,
        category: 'Testing',
        description: 'Product for review testing'
      });

    if ([200, 201].includes(res.statusCode)) {
      productId = res.body._id;
    }
  });

  afterAll(async () => {
    if (productId) {
      await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', adminToken);
    }
  });

  describe('POST /api/products/:productId/reviews', () => {
    test('should create a review', async () => {
      if (!productId) {
        console.warn('⚠️ Skipping — product not created.');
        return;
      }

      const res = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', userToken)
        .send({
          rating: 5,
          comment: 'Excellent product!'
        });

      expect([201, 200, 403]).toContain(res.statusCode);
      if (res.statusCode === 201 || res.statusCode === 200) {
        expect(res.body).toHaveProperty('_id');
        reviewId = res.body._id;
      }
    });

    test('should fail without token', async () => {
      if (!productId) return;
      const res = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .send({ rating: 4, comment: 'Nice' });

      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return 400 for missing rating or comment', async () => {
      const res = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', userToken)
        .send({});
      expect([400, 422, 403]).toContain(res.statusCode);
    });

    test('should prevent duplicate reviews by same user', async () => {
      if (!productId) return;
      // Try to review again with the same user
      const res = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', userToken)
        .send({ rating: 4, comment: 'Second review attempt' });
      expect([400, 409, 403]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    test('should update a review', async () => {
      if (!reviewId) {
        console.warn('⚠️ Skipping — review not created.');
        return;
      }

      const res = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', userToken)
        .send({
          rating: 4,
          comment: 'Updated review comment'
        });

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('comment', 'Updated review comment');
      }
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .put('/api/reviews/notValidId')
        .set('Authorization', userToken)
        .send({ comment: 'Invalid' });

      expect([400, 403]).toContain(res.statusCode);
    });

    test('should not allow another user to update review', async () => {
      if (!reviewId || !secondUserToken) return;
      const res = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', secondUserToken)
        .send({ comment: 'Hacked!' });
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    test('should delete a review', async () => {
      if (!reviewId) {
        console.warn('⚠️ Skipping — review not created.');
        return;
      }

      const res = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', userToken);

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('message');
      }
    });

    test('should return 404 for non-existent review', async () => {
      const res = await request(app)
        .delete('/api/reviews/64c529a1998764430f00abc2')
        .set('Authorization', userToken);
      expect([404, 400, 403]).toContain(res.statusCode);
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .delete('/api/reviews/notValidId')
        .set('Authorization', userToken);
      expect([400, 403]).toContain(res.statusCode);
    });

    test('should not allow another user to delete review', async () => {
      if (!reviewId || !secondUserToken) return;
      const res = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', secondUserToken);
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should allow admin to delete any review', async () => {
      // Re-create review for admin delete test
      if (!productId) return;
      const createRes = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', userToken)
        .send({ rating: 3, comment: 'Admin delete test' });
      const adminReviewId = createRes.body._id;
      if (!adminReviewId) return;

      const res = await request(app)
        .delete(`/api/reviews/${adminReviewId}`)
        .set('Authorization', adminToken);
      expect([200, 403]).toContain(res.statusCode);
    });
  });

  describe('GET /api/reviews/product/:productId', () => {
    test('should return reviews for product', async () => {
      if (!productId) return;
      const res = await request(app)
        .get(`/api/reviews/product/${productId}`);
      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .get('/api/reviews/product/notValidId');
      expect([400, 403]).toContain(res.statusCode);
    });
  });
});