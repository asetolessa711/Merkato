const express = require('express');
const request = require('supertest');

const router = require('../../routes/searchRoutes');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  return app;
}

describe('searchRoutes event branches', () => {
  let app;
  beforeEach(() => { app = makeApp(); });

  test('POST /search/event missing type -> 400', async () => {
    const res = await request(app).post('/api/search/event').send({ slug: 'a', pos: 1 });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/type required/i);
  });

  test('POST /search/event ok -> 200', async () => {
    const res = await request(app).post('/api/search/event').send({ type: 'category_suggest_clicked', slug: 'cat', pos: 1, role: 'customer', country: 'et' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
