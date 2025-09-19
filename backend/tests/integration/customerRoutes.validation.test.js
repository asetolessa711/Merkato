const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('Customer Routes: auth and validation', () => {
  let customerToken;
  let vendorToken;
  let addressId;

  beforeAll(async () => {
    await request(app).post('/api/dev/seed');
    // Fresh customer separate from seeded users
    const u = await registerTestUser();
    const { token: cTok } = await loginTestUser(u.email, 'Password123!');
    customerToken = cTok;
    // Login seeded vendor
    try {
      const { token: vTok } = await loginTestUser('vendor@test.com', 'Password123!');
      vendorToken = vTok;
    } catch (_) {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Vendor Auto', email: 'vendor@test.com', password: 'Password123!', country: 'ET', roles: ['vendor'] });
      const { token: vTok2 } = await loginTestUser('vendor@test.com', 'Password123!');
      vendorToken = vTok2;
    }
  });

  test('401 when missing token on GET addresses', async () => {
    const res = await request(app).get('/api/customer/addresses');
    expect(res.statusCode).toBe(401);
  });

  test('403 when vendor token hits customer-only endpoint', async () => {
    const res = await request(app)
      .get('/api/customer/addresses')
      .set('Authorization', `Bearer ${vendorToken}`);
    expect([401, 403]).toContain(res.statusCode);
  });

  test('Happy path: customer can add/get/update/delete addresses', async () => {
    // Add
    const add = await request(app)
      .post('/api/customer/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ label: 'Home', city: 'AA', country: 'ET', isDefault: true });
    expect(add.statusCode).toBe(200);
    expect(Array.isArray(add.body)).toBe(true);
    addressId = add.body[0]?._id;

    // Get
    const list = await request(app)
      .get('/api/customer/addresses')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(list.statusCode).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);

    // Update
    const upd = await request(app)
      .put(`/api/customer/addresses/${addressId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ city: 'Updated City' });
    expect(upd.statusCode).toBe(200);

    // Default
    const def = await request(app)
      .put(`/api/customer/addresses/default/${addressId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(def.statusCode).toBe(200);

    // Delete
    const del = await request(app)
      .delete(`/api/customer/addresses/${addressId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(del.statusCode).toBe(200);
  });
});
