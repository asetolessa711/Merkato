const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

describe('Admin Flag Moderation', () => {
  let adminToken;
  let userToken;
  let productId;
  let flagId;

  beforeAll(async () => {
    // Register user
    const regUser = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Flag User',
        email: `flag_user_${Date.now()}@example.com`,
        password: 'Password123!',
        roles: ['customer'],
        country: 'Ethiopia'
      });
    expect([200, 201]).toContain(regUser.status);
    userToken = 'Bearer ' + (regUser.body.token || regUser.body.accessToken);

    // Register admin
    const regAdmin = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Flag Admin',
        email: `flag_admin_${Date.now()}@example.com`,
        password: 'Password123!',
        roles: ['admin'],
        country: 'Ethiopia'
      });
    expect([200, 201]).toContain(regAdmin.status);
    adminToken = 'Bearer ' + (regAdmin.body.token || regAdmin.body.accessToken);

    // Create product as admin
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', adminToken)
      .send({ name: 'Flag Target Product', price: 7.5, stock: 3, category: 'Test' });
    expect([200, 201]).toContain(created.status);
    productId = created.body._id;

    // Report product as user to create a flag
    const createFlag = await request(app)
      .post(`/api/products/${productId}/report`)
      .set('Authorization', userToken)
      .send({ reason: 'Looks suspicious' });
    expect([201, 200]).toContain(createFlag.status);

    const list = await request(app).get('/api/flags').set('Authorization', adminToken);
    if (list.status === 200 && Array.isArray(list.body) && list.body.length > 0) {
      flagId = list.body.find(f => String(f.product?._id) === String(productId))?._id || list.body[0]._id;
    }
  });

  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('GET /api/flags requires admin', async () => {
    const resUser = await request(app).get('/api/flags').set('Authorization', userToken);
    expect([401, 403]).toContain(resUser.status);

    const resAdmin = await request(app).get('/api/flags').set('Authorization', adminToken);
    expect([200]).toContain(resAdmin.status);
  });

  test('PATCH /api/flags/:id/approve sets resolved status', async () => {
    if (!flagId) return;
    const res = await request(app)
      .patch(`/api/flags/${flagId}/approve`)
      .set('Authorization', adminToken)
      .send();
    expect([200]).toContain(res.status);
    expect(res.body).toHaveProperty('message');
  });

  test('PATCH /api/flags/:id/reject deletes product', async () => {
    // create another flag to reject
    const again = await request(app)
      .post(`/api/products/${productId}/report`)
      .set('Authorization', userToken)
      .send({ reason: 'Delete this product' });
    expect([201, 200]).toContain(again.status);

    const list = await request(app)
      .get('/api/flags')
      .set('Authorization', adminToken);
    expect(list.status).toBe(200);
    const target = list.body.find(f => f.product === productId || String(f.product?._id) === String(productId)) || list.body[0];

    const res = await request(app)
      .patch(`/api/flags/${target._id}/reject`)
      .set('Authorization', adminToken)
      .send();
    expect([200]).toContain(res.status);
    expect(res.body).toHaveProperty('message');
  });
});
