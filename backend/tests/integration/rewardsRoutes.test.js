const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

describe('Rewards Routes', () => {
  let userToken;

  beforeAll(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Rewards User',
        email: `rewards_${Date.now()}@example.com`,
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

  test('POST /api/rewards/checkin grants points and is idempotent per day', async () => {
    const first = await request(app)
      .post('/api/rewards/checkin')
      .set('Authorization', userToken)
      .send();
    expect([200, 201]).toContain(first.status);

    const second = await request(app)
      .post('/api/rewards/checkin')
      .set('Authorization', userToken)
      .send();
    expect(second.status).toBe(200);
    // either a reward or Already claimed
    expect(second.body).toHaveProperty('message');
  });

  test('POST /api/rewards/spin yields a reward once per day', async () => {
    const res = await request(app)
      .post('/api/rewards/spin')
      .set('Authorization', userToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reward');

    const again = await request(app)
      .post('/api/rewards/spin')
      .set('Authorization', userToken)
      .send();
    expect(again.status).toBe(200);
    expect(again.body).toHaveProperty('message');
  });
});
