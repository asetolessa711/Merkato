const request = require('supertest');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const app = require('../../server');

const DATA_DIR = path.join(__dirname, '..', '..', 'uploads');
const MENU_FILE = path.join(DATA_DIR, 'mega-menu.json');

// Provides a tiny mega menu file to drive search suggestions
async function seedMenu() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const doc = {
    version: 1,
    updatedAt: new Date().toISOString(),
    menu: [
      { title: 'Fashion', links: [ { label: "Women's Clothing" }, { label: 'Shoes' } ] },
      { title: 'Electronics', links: [ { label: 'Mobile Phones' }, { label: 'Laptops' } ] },
    ],
  };
  await fsp.writeFile(MENU_FILE, JSON.stringify(doc), 'utf8');
}

describe('Search Routes (Branch Coverage)', () => {
  beforeAll(async () => { await seedMenu(); });
  afterAll(async () => { if (process.env.JEST_CLOSE_DB === 'true') await mongoose.connection.close(); });

  test('suggest basic query returns matches (q filter path)', async () => {
    const res = await request(app).get('/api/search/suggest?q=lap&limit=2');
    expect(res.statusCode).toBe(200);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  test('suggest with language localization fallback (no match)', async () => {
    const res = await request(app).get('/api/search/suggest?q=fash&lang=am');
    expect(res.statusCode).toBe(200);
    expect(res.body.categories[0]).toHaveProperty('id');
  });

  test('event logging validation: missing type 400', async () => {
    const res = await request(app).post('/api/search/event').send({ slug: 'fashion' });
    expect(res.statusCode).toBe(400);
  });

  test('event logging success path', async () => {
    const res = await request(app).post('/api/search/event').send({ type: 'category_suggest_clicked', slug: 'fashion', pos: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
