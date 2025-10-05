const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const request = require('supertest');
let app = require('../../server');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const menuFile = path.join(uploadsDir, 'mega-menu.json');

describe('searchRoutes suggest + ETag', () => {
  beforeAll(async () => {
    await fsp.mkdir(uploadsDir, { recursive: true });
    const data = {
      version: 1,
      updatedAt: new Date().toISOString(),
      menu: [
        { title: 'Kitchen', links: [{ label: 'Toaster' }, { label: 'Kettle' }] },
        { title: 'Electronics', links: [{ label: 'Laptop' }] },
      ],
    };
    await fsp.writeFile(menuFile, JSON.stringify(data), 'utf8');
  });

  test('first GET returns 200 with ETag, second with If-None-Match -> 304', async () => {
    const res1 = await request(app)
      .get('/api/search/suggest')
      .query({ q: 'toaster', limit: 5 });
    expect(res1.statusCode).toBe(200);
    expect(res1.headers).toHaveProperty('etag');
    const body = JSON.parse(res1.text || '{}');
    expect(Array.isArray(body.categories)).toBe(true);
    expect(body.categories.length).toBeGreaterThanOrEqual(1);
    // ETag path
    const res2 = await request(app)
      .get('/api/search/suggest')
      .query({ q: 'toaster', limit: 5 })
      .set('If-None-Match', res1.headers.etag);
    expect(res2.statusCode).toBe(304);
  });
});
