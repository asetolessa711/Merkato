const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

describe('Behavior Routes', () => {
  let userToken;

  beforeAll(async () => {
    // Register an isolated customer
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Behavior User',
        email: `behavior_${Date.now()}@example.com`,
        password: 'Password123!',
        roles: ['customer'],
        country: 'Ethiopia'
      });
    expect([200, 201]).toContain(reg.status);
    userToken = 'Bearer ' + (reg.body.token || reg.body.accessToken);
  });

  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('POST /api/behavior/events validates eventName', async () => {
    const res = await request(app).post('/api/behavior/events').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/eventName required/i);
  });

  test('POST /api/behavior/events records anonymous event', async () => {
    const res = await request(app)
      .post('/api/behavior/events')
      .set('x-anon-id', 'anon-xyz')
      .send({ eventName: 'view_product', props: { pid: 'p1' } });
    expect([201, 200]).toContain(res.status);
    expect(res.body).toHaveProperty('success', true);
  });

  test('POST /api/behavior/merge requires token and anonymousId', async () => {
    // Missing anon id
    const bad = await request(app)
      .post('/api/behavior/merge')
      .set('Authorization', userToken)
      .send({});
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post('/api/behavior/merge')
      .set('Authorization', userToken)
      .send({ anonymousId: 'anon-xyz' });
    expect(ok.status).toBe(200);
    expect(ok.body).toHaveProperty('success', true);
  });

  test('POST /api/behavior/checkin is idempotent per day', async () => {
    const first = await request(app)
      .post('/api/behavior/checkin')
      .set('Authorization', userToken)
      .send();
    expect([201, 200]).toContain(first.status);

    const second = await request(app)
      .post('/api/behavior/checkin')
      .set('Authorization', userToken)
      .send();
    expect(second.status).toBe(200);
    expect(second.body).toHaveProperty('alreadyCheckedIn', true);
  });
});
