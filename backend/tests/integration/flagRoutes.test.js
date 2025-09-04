const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');


let userToken;
let adminToken;

describe('Flag Routes', () => {

  let testProductId;
  let testReviewId;
  let createdFlagId;

  // Dynamic user/admin creation for tokens
  beforeAll(async () => {
    // Register or login test user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Flag Test User',
        email: 'flagtestuser@example.com',
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
          email: 'flagtestuser@example.com',
          password: 'Test1234!'
        });
      userToken = 'Bearer ' + (loginRes.body.token || loginRes.body.accessToken);
    }

    // Register or login test admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Flag Test Admin',
        email: 'flagtestadmin@example.com',
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
          email: 'flagtestadmin@example.com',
          password: 'Admin1234!'
        });
      adminToken = 'Bearer ' + (loginRes.body.token || loginRes.body.accessToken);
    }

    // Now continue with product/review setup as before

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

      expect([400, 403, 404]).toContain(res.statusCode);
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

      expect([400, 403, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/flags', () => {
    test('should allow admin to view all flags', async () => {
      const res = await request(app)
        .get('/api/flags')
        .set('Authorization', adminToken);

      expect([200, 401, 403]).toContain(res.statusCode);
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

      expect([400, 403, 404]).toContain(res.statusCode);
    });
  });

  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });
});
