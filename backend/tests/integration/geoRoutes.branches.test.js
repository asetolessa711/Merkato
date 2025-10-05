const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

// Focus: exercise header precedence + accept-language fallback + error try/catch path

describe('Geo Routes (Branch Coverage)', () => {
  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') await mongoose.connection.close();
  });

  test('uses Cloudflare header when present', async () => {
    const res = await request(app).get('/api/geo/ip').set('cf-ipcountry', 'US');
    expect(res.statusCode).toBe(200);
    expect(res.body.countryCode).toBe('US');
    expect(res.body.source).toBe('header');
  });

  test('falls back to accept-language heuristic', async () => {
    const res = await request(app).get('/api/geo/ip').set('accept-language', 'am-ET,am;q=0.9');
    expect(res.statusCode).toBe(200);
    // am -> ET mapping
    expect(res.body.countryCode).toBe('ET');
  });

  test('default fallback when nothing provided', async () => {
    const res = await request(app).get('/api/geo/ip');
    expect(res.statusCode).toBe(200);
    expect(res.body.countryCode).toBe('ET');
  });
});
