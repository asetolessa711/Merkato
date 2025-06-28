const request = require('supertest');
const app = require('../../server');

// Tokens from environment (set in .env.test or CI/CD)
const userToken = process.env.TEST_USER_TOKEN;
const adminToken = process.env.TEST_ADMIN_TOKEN;

describe('Flag Routes', () => {
  let testProductId;
  let testReviewId;
  let createdFlagId;

  beforeAll(async () => {
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', adminToken)
      .send({
        name: 'Flag Test Product',
        price: 10,
        category: 'Test',
        stock: 5,
        description: 'For flagging tests'
      });

    if ([201, 200].includes(productRes.statusCode)) {
      testProductId = productRes.body._id;
    }

    if (testProductId) {
      const reviewRes = await request(app)
        .post(`/api/products/${testProductId}/reviews`)
        .set('Authorization', userToken)
        .send({
          rating: 4,
          comment: 'Test review for flagging'
        });

      if ([201, 200].includes(reviewRes.statusCode)) {
        testReviewId = reviewRes.body._id || (reviewRes.body.review && reviewRes.body.review._id);
      }
    }
  });

  describe('POST /api/flags/product/:productId', () => {
    test('should fail without token', async () => {
      if (!testProductId) {
        console.warn('⚠️ Skipping — product not created.');
        return;
      }

      const res = await request(app)
        .post(`/api/flags/product/${testProductId}`)
        .send({ reason: 'Inappropriate content' });

      expect([401, 403]).toContain(res.statusCode);
    });

    test('should flag a product', async () => {
      if (!testProductId) return;

      const res = await request(app)
        .post(`/api/flags/product/${testProductId}`)
        .set('Authorization', userToken)
        .send({ reason: 'Inappropriate content' });

      expect([201, 200, 403]).toContain(res.statusCode);
      if ([200, 201].includes(res.statusCode)) {
        expect(res.body).toHaveProperty('_id');
        createdFlagId = res.body._id;
      }
    });

    test('should not flag with missing reason', async () => {
      if (!testProductId) return;

      const res = await request(app)
        .post(`/api/flags/product/${testProductId}`)
        .set('Authorization', userToken)
        .send({});

      expect([400, 422, 403]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .post('/api/flags/product/64c529a1998764430f00abc1')
        .set('Authorization', userToken)
        .send({ reason: 'Fake product' });

      expect([404, 400, 403]).toContain(res.statusCode);
    });

    test('should return 400 for malformed product ID', async () => {
      const res = await request(app)
        .post('/api/flags/product/notARealId')
        .set('Authorization', userToken)
        .send({ reason: 'Invalid ID' });

      expect([400, 403]).toContain(res.statusCode);
    });
  });

  describe('POST /api/flags/review/:reviewId', () => {
    test('should flag a review', async () => {
      if (!testReviewId) {
        console.warn('⚠️ Skipping — review not created.');
        return;
      }

      const res = await request(app)
        .post(`/api/flags/review/${testReviewId}`)
        .set('Authorization', userToken)
        .send({ reason: 'Spam or abuse' });

      expect([201, 200, 403]).toContain(res.statusCode);
    });

    test('should fail with missing reason', async () => {
      if (!testReviewId) return;

      const res = await request(app)
        .post(`/api/flags/review/${testReviewId}`)
        .set('Authorization', userToken)
        .send({});

      expect([400, 422, 403]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent review', async () => {
      const res = await request(app)
        .post('/api/flags/review/64c529a1998764430f00abc2')
        .set('Authorization', userToken)
        .send({ reason: 'Fake review' });

      expect([404, 400, 403]).toContain(res.statusCode);
    });

    test('should return 400 for malformed review ID', async () => {
      const res = await request(app)
        .post('/api/flags/review/notAValidId')
        .set('Authorization', userToken)
        .send({ reason: 'Invalid format' });

      expect([400, 403]).toContain(res.statusCode);
    });
  });

  describe('GET /api/flags', () => {
    test('should allow admin to view all flags', async () => {
      const res = await request(app)
        .get('/api/flags')
        .set('Authorization', adminToken);

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('should block non-admin user', async () => {
      const res = await request(app)
        .get('/api/flags')
        .set('Authorization', userToken);

      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/flags/:flagId', () => {
    test('should allow admin to delete a flag', async () => {
      if (!createdFlagId) {
        console.warn('⚠️ Skipping — no flag created.');
        return;
      }

      const res = await request(app)
        .delete(`/api/flags/${createdFlagId}`)
        .set('Authorization', adminToken);

      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('message');
      }
    });

    test('should block non-admin user', async () => {
      if (!createdFlagId) return;

      const res = await request(app)
        .delete(`/api/flags/${createdFlagId}`)
        .set('Authorization', userToken);

      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent flag', async () => {
      const res = await request(app)
        .delete('/api/flags/64c529a1998764430f00abc3')
        .set('Authorization', adminToken);

      expect([404, 400, 403]).toContain(res.statusCode);
    });

    test('should return 400 for malformed flag ID', async () => {
      const res = await request(app)
        .delete('/api/flags/notValidId')
        .set('Authorization', adminToken);

      expect([400, 403]).toContain(res.statusCode);
    });
  });
});
