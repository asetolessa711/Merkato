const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('productRoutes validation paths (non-test env)', () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origRelax = process.env.RELAX_UPLOAD_VALIDATION;
  let vendor;
  let vendorToken;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.RELAX_UPLOAD_VALIDATION = 'false';

    vendor = await registerTestUser({ roles: ['vendor'], name: 'Vendor ValPaths' });
    const v = await loginTestUser(vendor.email, 'Password123!');
    vendorToken = `Bearer ${v.token}`;
  });

  afterAll(async () => {
    process.env.NODE_ENV = origNodeEnv;
    process.env.RELAX_UPLOAD_VALIDATION = origRelax;
    try {
      if (vendor && vendor._id) {
        await deleteTestUser(vendor._id, vendorToken);
      }
    } catch (_) {}
  });

  test('POST /api/products returns 400 when category is invalid (real validation path)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', vendorToken)
      .send({ name: 'Invalid Cat Product', price: 5, categorySlug: 'nonexistent-slug-xyz' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});
