const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');
const Feedback = require('../../models/Feedback');

describe('feedbackRoutes branches', () => {
  let token;

  beforeAll(async () => {
    // Create a basic customer and login to get a token
    const reg = await registerTestUser();
    const creds = await loginTestUser(reg.email, 'Password123!');
    token = creds.token;
  });

  test('POST /api/feedback missing required message triggers ValidationError -> 400', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, category: 'ux' }); // no message

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Validation error');
  });

  test('POST /api/feedback handles unexpected save error -> 500', async () => {
    // Mock instance save to throw a non-validation error for this invocation
    const spy = jest
      .spyOn(Feedback.prototype, 'save')
      .mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'hello', rating: 4, category: 'feature' });

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('message', 'Failed to submit feedback');

    spy.mockRestore();
  });
});
