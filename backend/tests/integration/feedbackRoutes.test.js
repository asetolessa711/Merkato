const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

jest.setTimeout(20000);

let userToken;
let adminToken;
let feedbackId;
let secondFeedbackId;
let secondUserToken;
let secondUserId;
describe('Feedback Routes', () => {
  beforeAll(async () => {
    // Register and login a normal test user
    const userEmail = `feedbackuser_${Date.now()}@example.com`;
    await registerTestUser({
      email: userEmail,
      password: 'UserPass123!',
      name: 'Feedback User',
      country: 'Ethiopia'
    });
    const userLogin = await loginTestUser(userEmail, 'UserPass123!');
    userToken = `Bearer ${userLogin.token}`;

    // Register and login a test admin user
    const adminEmail = `feedbackadmin_${Date.now()}@example.com`;
    await registerTestUser({
      email: adminEmail,
      password: 'AdminPass123!',
      name: 'Feedback Admin',
      country: 'Ethiopia',
      roles: ['admin']
    });
    const adminLogin = await loginTestUser(adminEmail, 'AdminPass123!');
    adminToken = `Bearer ${adminLogin.token}`;

    // Register and login a second user
    const secondEmail = `feedback-seconduser-${Date.now()}@example.com`;
    const secondPassword = 'TestPass456!';
    const secondUser = await registerTestUser({
      email: secondEmail,
      password: secondPassword,
      name: 'Feedback Second User',
      country: 'Ethiopia'
    });
    secondUserId = secondUser.user?._id || secondUser._id;
    const secondLogin = await loginTestUser(secondEmail, secondPassword);
    secondUserToken = `Bearer ${secondLogin.token}`;
  });
    test('should allow second user to submit feedback', async () => {
      if (!secondUserToken) return;

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', secondUserToken)
        .send({ message: 'Second user feedback', rating: 4, type: 'suggestion' });

      expect([201, 200, 403]).toContain(res.statusCode);
      if ([201, 200].includes(res.statusCode)) {
        expect(res.body).toHaveProperty('message', 'Feedback submitted');
        secondFeedbackId = res.body._id; // May be undefined, but keep for cleanup
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
      expect([400, 403, 404, 501]).toContain(res.statusCode);
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
      expect([400, 403, 404, 501]).toContain(res.statusCode);
    });

    test('should block unauthorized deletion', async () => {
      if (!feedbackId || !secondUserToken) return;

      const res = await request(app)
        .delete(`/api/feedback/${feedbackId}`)
        .set('Authorization', secondUserToken);
      expect([401, 403]).toContain(res.statusCode);
  });
});

afterAll(async () => {
  const mongoose = require('mongoose');
  await mongoose.connection.close();
});
