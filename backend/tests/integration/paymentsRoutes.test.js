const request = require('supertest');
const app = require('../../server');

// Minimal integration tests for payments routes

describe('Payments Routes', () => {
  test('GET /api/payments/health returns ok', async () => {
    const res = await request(app).get('/api/payments/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('POST /api/payments/session validates input', async () => {
    const res = await request(app)
      .post('/api/payments/session')
      .send({ amount: '10', currency: '' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/amount \(number\) and currency are required/i);
  });

  test('POST /api/payments/session creates a stub session and echoes idempotency key', async () => {
    const idemKey = 'abc-123';
    const res = await request(app)
      .post('/api/payments/session')
      .set('Idempotency-Key', idemKey)
      .send({ amount: 1099, currency: 'USD' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ amount: 1099, currency: 'USD', idempotencyKey: idemKey });
    expect(res.body.sessionId).toMatch(/^test_sess_/);
  });

  test('POST /api/payments/webhook returns 200 (stub)', async () => {
    const res = await request(app).post('/api/payments/webhook').send({ type: 'payment.succeeded' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});
