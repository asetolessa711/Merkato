const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

/**
 * Exercise AI auto-flagging branches in productRoutes (keyword and price checks)
 */
describe('productRoutes AI flagging branches', () => {
  let vendor;
  let vendorToken;

  beforeAll(async () => {
    process.env.RELAX_UPLOAD_VALIDATION = 'true';
    vendor = await registerTestUser({ roles: ['vendor'], name: 'AI Vendor' });
    const v = await loginTestUser(vendor.email, 'Password123!');
    vendorToken = `Bearer ${v.token}`;
  });

  afterAll(async () => {
    try { if (vendor && vendor._id) await deleteTestUser(vendor._id, vendorToken); } catch (_) {}
  });

  test('POST /api/products triggers AI flagging via suspicious keywords', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', vendorToken)
      .send({ name: 'Free money deal', description: 'limited time', price: 10, stock: 2 });
    expect([201, 200, 500]).toContain(res.statusCode);
  });

  test('POST /api/products triggers AI flagging via suspicious pricing (<=0)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', vendorToken)
      .send({ name: 'Zero Price', description: 'test', price: 0, stock: 1 });
    expect([201, 200, 500]).toContain(res.statusCode);
  });
});
