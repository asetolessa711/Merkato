const request = require('supertest');
const app = require('../../server');
const { registerTestUser } = require('../utils/testUserUtils');

describe('railsRoutes admin CRUD branches', () => {
  let admin;
  beforeAll(async () => {
    admin = await registerTestUser({ role: 'admin' });
  });

  test('POST /admin/rails rejects invalid placementKey', async () => {
    const res = await request(app)
      .post('/api/admin/rails')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ title: 'X', placementKey: 'NotARealKey' })
      .expect(400);
    expect(res.body && res.body.message).toMatch(/Invalid placementKey/);
  });

  test('POST /admin/rails/presets/resolve 404 for unknown', async () => {
    const res = await request(app)
      .post('/api/admin/rails/presets/resolve?preset=__nope__')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(404);
    expect(res.body && res.body.message).toMatch(/Preset not found/);
  });

  test('POST /admin/rails/duplicate/:railId returns 404 when missing', async () => {
    await request(app)
      .post('/api/admin/rails/duplicate/does_not_exist')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(404);
  });
});
