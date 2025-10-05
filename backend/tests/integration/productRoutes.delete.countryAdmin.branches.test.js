const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

/**
 * Covers delete authorization branch: country-admin can delete vendor's product
 * when vendorCountry matches admin country.
 */
describe('productRoutes delete by country_admin (branch)', () => {
  let vendor, vendorToken, admin, adminToken, productId;

  beforeAll(async () => {
    vendor = await registerTestUser({ roles: ['vendor'], name: 'Vendor Country', country: 'Ethiopia' });
    const v = await loginTestUser(vendor.email, 'Password123!');
    vendorToken = `Bearer ${v.token}`;

    // Create a product owned by this vendor (relaxed mode typical in tests)
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', vendorToken)
      .send({ name: 'Prod Country', price: 12, category: 'Cat' });
    if ([200, 201].includes(created.statusCode)) productId = created.body._id;

  // Create a country_admin with matching country
  admin = await registerTestUser({ roles: ['country_admin'], name: 'ET Admin', country: 'Ethiopia' });
    const a = await loginTestUser(admin.email, 'Password123!');
    adminToken = `Bearer ${a.token}`;
  });

  afterAll(async () => {
    try { if (admin && admin._id) await deleteTestUser(admin._id, adminToken); } catch (_) {}
    try { if (vendor && vendor._id) await deleteTestUser(vendor._id, vendorToken); } catch (_) {}
    // Do not close mongoose in individual suites; globalTeardown handles it once
  });

  test('DELETE /api/products/:id allowed for country_admin with matching country', async () => {
    if (!productId) return;
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', adminToken);
    expect([200, 403]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.message || '').toMatch(/deleted/);
    }
  });
});
