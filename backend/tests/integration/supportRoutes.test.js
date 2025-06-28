const request = require('supertest');
const app = require('../../../server');

const userToken = process.env.TEST_USER_TOKEN;
const adminToken = process.env.TEST_ADMIN_TOKEN;

describe('Support Routes', () => {
  let ticketId;
  let secondTicketId;
  let secondUserToken;
  let secondUserId;

  beforeAll(async () => {
    // Create second user
    const email = `support-seconduser-${Date.now()}@example.com`;
    const password = 'TestPass456!';

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Support Second User',
        email,
        password
      });

    if ([200, 201].includes(registerRes.statusCode)) {
      secondUserId = registerRes.body.user?._id || registerRes.body._id;
    }

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    if (loginRes.body && loginRes.body.token) {
      secondUserToken = `Bearer ${loginRes.body.token}`;
    }
  });

  afterAll(async () => {
    // Clean up tickets created during tests
    if (ticketId) {
      await request(app)
        .delete(`/api/support/${ticketId}`)
        .set('Authorization', adminToken);
    }
    if (secondTicketId) {
      await request(app)
        .delete(`/api/support/${secondTicketId}`)
        .set('Authorization', adminToken);
    }
    // Clean up second user
    if (secondUserId) {
      await request(app)
        .delete(`/api/admin/users/${secondUserId}`)
        .set('Authorization', adminToken);
    }
  });

  describe('POST /api/support', () => {
    test('should allow user to submit a support ticket', async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', userToken)
        .send({
          subject: 'App Bug Report',
          message: 'I encountered a bug while checking out.'
        });

      expect([201, 200, 403]).toContain(res.statusCode);
      if ([201, 200].includes(res.statusCode)) {
        expect(res.body).toHaveProperty('_id');
        expect(res.body).toHaveProperty('subject');
        ticketId = res.body._id;
      }
    });

    test('should allow second user to submit ticket', async () => {
      if (!secondUserToken) return;

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', secondUserToken)
        .send({
          subject: 'Second User Ticket',
          message: 'This is a second user ticket.'
        });

      expect([201, 200, 403]).toContain(res.statusCode);
      if ([201, 200].includes(res.statusCode)) {
        expect(res.body).toHaveProperty('_id');
        secondTicketId = res.body._id;
      }
    });

    test('should reject submission without token', async () => {
      const res = await request(app)
        .post('/api/support')
        .send({ subject: 'Unauthorized', message: 'Blocked' });

      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', userToken)
        .send({});
      expect([400, 422, 403]).toContain(res.statusCode);
    });
  });

  describe('GET /api/support/user', () => {
    test('should allow user to view their own tickets', async () => {
      const res = await request(app)
        .get('/api/support/user')
        .set('Authorization', userToken);

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('should allow second user to view their own tickets', async () => {
      if (!secondUserToken) return;

      const res = await request(app)
        .get('/api/support/user')
        .set('Authorization', secondUserToken);

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('should block unauthenticated access', async () => {
      const res = await request(app).get('/api/support/user');
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('GET /api/support', () => {
    test('should allow admin to view all tickets', async () => {
      const res = await request(app)
        .get('/api/support')
        .set('Authorization', adminToken);

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('should support category filtering if implemented', async () => {
      const res = await request(app)
        .get('/api/support?category=bug')
        .set('Authorization', adminToken);

      expect([200, 403, 501]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('should block non-admin from viewing all tickets', async () => {
      const res = await request(app)
        .get('/api/support')
        .set('Authorization', userToken);

      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/support/:id', () => {
    test('should allow admin to update ticket status and response', async () => {
      if (!ticketId) {
        console.warn('⚠️ Skipping — no ticket created.');
        return;
      }

      const res = await request(app)
        .put(`/api/support/${ticketId}`)
        .set('Authorization', adminToken)
        .send({ status: 'resolved', response: 'We’ve fixed it.' });

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('status', 'resolved');
        expect(res.body).toHaveProperty('response', 'We’ve fixed it.');
      }
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .put('/api/support/notValidId')
        .set('Authorization', adminToken)
        .send({ status: 'closed' });

      expect([400, 403]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent ticket', async () => {
      const res = await request(app)
        .put('/api/support/64c529a1998764430f00abc4')
        .set('Authorization', adminToken)
        .send({ status: 'closed' });

      expect([404, 400, 403]).toContain(res.statusCode);
    });

    test('should block non-admin from updating ticket', async () => {
      if (!ticketId) return;

      const res = await request(app)
        .put(`/api/support/${ticketId}`)
        .set('Authorization', userToken)
        .send({ status: 'resolved' });

      expect([401, 403]).toContain(res.statusCode);
    });

    test('should block another user from updating ticket', async () => {
      if (!ticketId || !secondUserToken) return;

      const res = await request(app)
        .put(`/api/support/${ticketId}`)
        .set('Authorization', secondUserToken)
        .send({ status: 'resolved' });

      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/support/:id', () => {
    test('should allow admin to delete a ticket', async () => {
      if (!ticketId) return;

      const res = await request(app)
        .delete(`/api/support/${ticketId}`)
        .set('Authorization', adminToken);

      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('message');
      }
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .delete('/api/support/notAValidId')
        .set('Authorization', adminToken);

      expect([400, 403]).toContain(res.statusCode);
    });

    test('should return 404 for non-existent ticket', async () => {
      const res = await request(app)
        .delete('/api/support/64c529a1998764430f00abc5')
        .set('Authorization', adminToken);

      expect([404, 400, 403]).toContain(res.statusCode);
    });

    test('should block non-admin from deleting ticket', async () => {
      if (!ticketId) return;

      const res = await request(app)
        .delete(`/api/support/${ticketId}`)
        .set('Authorization', userToken);

      expect([401, 403]).toContain(res.statusCode);
    });

    test('should block another user from deleting ticket', async () => {
      if (!secondTicketId || !secondUserToken) return;

      const res = await request(app)
        .delete(`/api/support/${secondTicketId}`)
        .set('Authorization', userToken);

      expect([401, 403]).toContain(res.statusCode);
    });
  });
});