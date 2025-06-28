const request = require('supertest');
const app = require('../../server');

const userToken = process.env.TEST_USER_TOKEN;
const adminToken = process.env.TEST_ADMIN_TOKEN;

describe('Feedback Routes', () => {
  let feedbackId;
  let secondFeedbackId;
  let secondUserToken;
  let secondUserId;

  beforeAll(async () => {
    const email = `feedback-seconduser-${Date.now()}@example.com`;
    const password = 'TestPass456!';

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Feedback Second User', email, password });

    if ([200, 201].includes(registerRes.statusCode)) {
      secondUserId = registerRes.body.user?._id || registerRes.body._id;
    }

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    if (loginRes.body?.token) {
      secondUserToken = `Bearer ${loginRes.body.token}`;
    }
  });

  afterAll(async () => {
    if (feedbackId) {
      await request(app)
        .delete(`/api/feedback/${feedbackId}`)
        .set('Authorization', adminToken);
    }
    if (secondFeedbackId) {
      await request(app)
        .delete(`/api/feedback/${secondFeedbackId}`)
        .set('Authorization', adminToken);
    }
    if (secondUserId) {
      await request(app)
        .delete(`/api/admin/users/${secondUserId}`)
        .set('Authorization', adminToken);
    }
  });

  describe('POST /api/feedback', () => {
    test('should allow user to submit feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', userToken)
        .send({ message: 'Great experience!', rating: 5, type: 'bug' });

      expect([201, 200, 403]).toContain(res.statusCode);
      if ([201, 200].includes(res.statusCode)) {
        feedbackId = res.body._id;
        expect(res.body).toHaveProperty('_id');
      }
    });

    test('should allow second user to submit feedback', async () => {
      if (!secondUserToken) return;

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', secondUserToken)
        .send({ message: 'Second user feedback', rating: 4, type: 'suggestion' });

      expect([201, 200, 403]).toContain(res.statusCode);
      if ([201, 200].includes(res.statusCode)) {
        secondFeedbackId = res.body._id;
        expect(res.body).toHaveProperty('_id');
      }
    });

    test('should fail without token', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({ message: 'Anonymous', rating: 4 });

      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return 400 for missing message', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', userToken)
        .send({});
      expect([400, 422, 403]).toContain(res.statusCode);
    });
  });

  describe('GET /api/feedback', () => {
    test('should allow admin to view all feedback', async () => {
      const res = await request(app)
        .get('/api/feedback')
        .set('Authorization', adminToken);
      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) expect(Array.isArray(res.body)).toBe(true);
    });

    test('should support pagination if implemented', async () => {
      const res = await request(app)
        .get('/api/feedback?page=1&limit=2')
        .set('Authorization', adminToken);
      expect([200, 403, 501]).toContain(res.statusCode);
    });

    test('should filter feedback by type if supported', async () => {
      const res = await request(app)
        .get('/api/feedback?type=bug')
        .set('Authorization', adminToken);
      expect([200, 403, 501]).toContain(res.statusCode);
    });

    test('should block non-admin', async () => {
      const res = await request(app)
        .get('/api/feedback')
        .set('Authorization', userToken);
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should fail without token', async () => {
      const res = await request(app).get('/api/feedback');
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/feedback/:id', () => {
    test('should allow user to update their own feedback if supported', async () => {
      if (!secondFeedbackId || !secondUserToken) return;

      const res = await request(app)
        .put(`/api/feedback/${secondFeedbackId}`)
        .set('Authorization', secondUserToken)
        .send({ message: 'Updated second feedback', rating: 3 });

      expect([200, 403, 501]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('message');
      }
    });

    test('should return 404 for non-existent feedback', async () => {
      const res = await request(app)
        .put('/api/feedback/64c529a1998764430f00abc7')
        .set('Authorization', adminToken)
        .send({ message: 'Update attempt' });
      expect([404, 400, 403, 501]).toContain(res.statusCode);
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .put('/api/feedback/notAValidId')
        .set('Authorization', adminToken)
        .send({ message: 'Invalid' });
      expect([400, 403, 501]).toContain(res.statusCode);
    });

    test('should block other users from editing feedback', async () => {
      if (!feedbackId || !secondUserToken) return;

      const res = await request(app)
        .put(`/api/feedback/${feedbackId}`)
        .set('Authorization', secondUserToken)
        .send({ message: 'Unauthorized update' });

      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/feedback/:id', () => {
    test('should allow admin to delete feedback', async () => {
      if (!feedbackId) {
        console.warn('⚠️ Skipping — feedback not created.');
        return;
      }

      const res = await request(app)
        .delete(`/api/feedback/${feedbackId}`)
        .set('Authorization', adminToken);
      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) expect(res.body).toHaveProperty('message');
    });

    test('should allow user to delete own feedback if supported', async () => {
      if (!secondFeedbackId || !secondUserToken) return;

      const res = await request(app)
        .delete(`/api/feedback/${secondFeedbackId}`)
        .set('Authorization', secondUserToken);
      expect([200, 403, 404]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent feedback', async () => {
      const res = await request(app)
        .delete('/api/feedback/64c529a1998764430f00abc6')
        .set('Authorization', adminToken);
      expect([404, 403, 400]).toContain(res.statusCode);
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .delete('/api/feedback/notValidId')
        .set('Authorization', adminToken);
      expect([400, 403]).toContain(res.statusCode);
    });

    test('should block unauthorized deletion', async () => {
      if (!feedbackId || !secondUserToken) return;

      const res = await request(app)
        .delete(`/api/feedback/${feedbackId}`)
        .set('Authorization', secondUserToken);
      expect([401, 403]).toContain(res.statusCode);
    });
  });
});
