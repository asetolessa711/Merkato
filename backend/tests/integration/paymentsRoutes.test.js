const request = require('supertest');
const app = require('../../server');

// Minimal integration tests for payments routes

describe('Payments Routes @payments', () => {
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
    expect(res.body.message).toMatch(/amount .* and currency/i);
  });

  test('POST /api/payments/session rejects non-positive amount', async () => {
    const res = await request(app)
      .post('/api/payments/session')
      .send({ amount: 0, currency: 'USD' });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/payments/session rejects bad currency format', async () => {
    const res = await request(app)
      .post('/api/payments/session')
      .send({ amount: 100, currency: 'usd' });
    expect(res.statusCode).toBe(400);
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

  test('POST /api/payments/session replays same response when Idempotency-Key is reused with same payload', async () => {
    const idemKey = 'replay-xyz';
    const payload = { amount: 5000, currency: 'USD' };

    const first = await request(app)
      .post('/api/payments/session')
      .set('Idempotency-Key', idemKey)
      .send(payload);
    expect(first.statusCode).toBe(201);

    const second = await request(app)
      .post('/api/payments/session')
      .set('Idempotency-Key', idemKey)
      .send(payload);
    expect(second.statusCode).toBe(201);
    expect(second.body).toEqual(first.body);
  });

  test('POST /api/payments/session returns 409 when Idempotency-Key is reused with different payload', async () => {
    const idemKey = 'conflict-xyz';
    const first = await request(app)
      .post('/api/payments/session')
      .set('Idempotency-Key', idemKey)
      .send({ amount: 1999, currency: 'USD' });
    expect(first.statusCode).toBe(201);

    const conflict = await request(app)
      .post('/api/payments/session')
      .set('Idempotency-Key', idemKey)
      .send({ amount: 2999, currency: 'USD' });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.body.message).toMatch(/idempotency key conflict/i);
  });

  test('POST /api/payments/webhook returns 200 (stub)', async () => {
    const res = await request(app).post('/api/payments/webhook').send({ type: 'payment.succeeded' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});
