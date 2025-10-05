const request = require('supertest');
const app = require('../../server');
const Rail = require('../../models/Rail');

// Helpers
async function registerAdmin(agent) {
  const email = `rails_admin_${Date.now()}@example.com`;
  const res = await agent.post('/api/auth/register').send({
    name: 'Rails Admin',
    email,
    password: 'TestPass123!',
    roles: ['admin']
  });
  const token = res.body.token;
  expect(token).toBeTruthy();
  return token;
}

async function seedRails() {
  // normalize ids to lowercase since model trims/lowercases in pre-validate
  const rails = [
    { railId: 'tst_home_hero', title: 'Home Hero', status: 'published', owner: 'Marketing', environment: 'Prod', placementKey: 'Hero', opsStatus: 'active' },
    { railId: 'tst_home_mid', title: 'Home Mid', status: 'draft', owner: 'Vendor', environment: 'Staging', placementKey: 'Mid', opsStatus: 'paused' },
    { railId: 'tst_cat_top', title: 'Category Top', status: 'published', owner: 'System+Marketing', environment: 'Prod', placementKey: 'CategoryTop', opsStatus: 'archived' },
  ];
  await Rail.deleteMany({ railId: { $in: rails.map(r=>r.railId) } });
  await Rail.insertMany(rails);
  return rails.map(r=>r.railId);
}

describe('Rails Routes — list + bulk', () => {
  let agent; let token; let seededIds;
  beforeAll(async () => {
    agent = request(app);
    token = await registerAdmin(agent);
    seededIds = await seedRails();
  });

  test('GET /admin/rails returns filtered and paginated list', async () => {
    // filter by environment=Prod and opsStatus=active
    const res = await agent
      .get('/api/admin/rails?environment=Prod&opsStatus=active&page=1&pageSize=1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rails');
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(1);
    // One of our seeded rails should match (tst_home_hero)
    expect(Array.isArray(res.body.rails)).toBe(true);
    if (res.body.rails.length) {
      expect(res.body.rails[0]).toHaveProperty('railId');
    }
  });

  test('GET /admin/rails supports search across railId/title/displayName', async () => {
    const res = await agent
      .get('/api/admin/rails?search=home')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const ids = res.body.rails.map(r=>r.railId);
    expect(ids.some(id=>id.includes('home'))).toBe(true);
  });

  test('PATCH /admin/rails/bulk validates inputs and updates allowed fields', async () => {
    // Missing railIds
    let res = await agent
      .patch('/api/admin/rails/bulk')
      .send({ updates: { owner: 'Marketing' } })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/railIds required/i);

    // Missing valid updates
    res = await agent
      .patch('/api/admin/rails/bulk')
      .send({ railIds: seededIds, updates: { title: 'NotAllowed' } })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no valid updates/i);

    // Happy path: change owner and opsStatus
    res = await agent
      .patch('/api/admin/rails/bulk')
      .send({ railIds: seededIds, updates: { owner: 'System+Marketing', opsStatus: 'active' } })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('updated');
    expect(res.body.updated).toBeGreaterThanOrEqual(1);

    // Verify one doc was updated accordingly
    const doc = await Rail.findOne({ railId: seededIds[1] });
    expect(doc.owner).toBe('System+Marketing');
    expect(doc.opsStatus).toBe('active');
    expect(doc.meta && doc.meta.updatedAtUTC).toBeTruthy();
  });
});
