const fsp = require('fs/promises');
const path = require('path');
const request = require('supertest');
let app = require('../../server');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const menuFile = path.join(uploadsDir, 'mega-menu.json');

describe('searchRoutes suggest without q (top categories)', () => {
  beforeAll(async () => {
    await fsp.mkdir(uploadsDir, { recursive: true });
    const data = {
      version: 1,
      updatedAt: new Date().toISOString(),
      menu: [
        { title: 'Alpha', links: [{ label: 'A1' }] },
        { title: 'Bravo', links: [{ label: 'B1' }] },
        { title: 'Charlie', links: [{ label: 'C1' }] },
        { title: 'Delta', links: [{ label: 'D1' }] }
      ],
    };
    await fsp.writeFile(menuFile, JSON.stringify(data), 'utf8');
  });

  test('GET /api/search/suggest (no q) returns up to limit categories', async () => {
    const res = await request(app)
      .get('/api/search/suggest')
      .query({ limit: 3 });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.text || '{}');
    expect(Array.isArray(body.categories)).toBe(true);
    expect(body.categories.length).toBeGreaterThanOrEqual(1);
    expect(body.categories.length).toBeLessThanOrEqual(3);
  });
});
