const express = require('express');
const request = require('supertest');

describe('sendEmail resetRateLimiter 429 handler', () => {
  let app;
  beforeAll(() => {
    // Import after clearing module cache to avoid interfering with other tests
    jest.resetModules();
    const { resetRateLimiter } = require('../../utils/sendEmail');
    app = express();
    app.use(express.json());
    // Apply limiter to a simple endpoint that always returns 200 otherwise
    app.post('/forgot', resetRateLimiter, (req, res) => {
      res.json({ ok: true });
    });
  });

  test('exceeding requests triggers 429 with expected message', async () => {
    // Limit is 5 per 15 minutes; send 6 requests
    for (let i = 0; i < 5; i++) {
      const ok = await request(app).post('/forgot').send({ email: 'a@example.com' });
      expect([200, 201]).toContain(ok.statusCode);
    }
    const blocked = await request(app).post('/forgot').send({ email: 'a@example.com' });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body).toHaveProperty('message');
  });
});
