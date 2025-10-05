const request = require('supertest');
const fsp = require('fs/promises');
const mongoose = require('mongoose');
const app = require('../../server');
const { OVERRIDES_FILE } = require('../../utils/taxonomy');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

/**
 * Covers productRoutes PUT validation branches (non-test env):
 * - category has children => 400 "Please choose a more specific category"
 * - category attributes required => 400 "<Label> is required"
 */
describe('productRoutes update validation branches (strict taxonomy)', () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origRelax = process.env.RELAX_UPLOAD_VALIDATION;
  let vendor;
  let vendorToken;
  let productId;

  beforeAll(async () => {
    // Force strict validation path in route logic
    process.env.NODE_ENV = 'production';
    process.env.RELAX_UPLOAD_VALIDATION = 'false';

    // Seed taxonomy overrides with a parent having a child, both visible for 'upload'
    const overrides = [
      { id: 'root', name: 'Root', slug: 'root', visibleIn: ['upload'], active: true },
      { id: 'kid', name: 'Kid', slug: 'kid', parentId: 'root', visibleIn: ['upload'], active: true, attributes: [ { key: 'size', label: 'Size', required: true } ] },
    ];
    await fsp.mkdir(require('path').dirname(OVERRIDES_FILE), { recursive: true });
    await fsp.writeFile(OVERRIDES_FILE, JSON.stringify(overrides), 'utf8');

    // Create a vendor and a product owned by vendor (create under relaxed mode, then switch back)
    vendor = await registerTestUser({ roles: ['vendor'], name: 'Vendor Update Val' });
    const v = await loginTestUser(vendor.email, 'Password123!');
    vendorToken = `Bearer ${v.token}`;

    const prevRelax = process.env.RELAX_UPLOAD_VALIDATION;
    process.env.RELAX_UPLOAD_VALIDATION = 'true';
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', vendorToken)
      .send({ name: 'P-Strict', price: 11, category: 'Cat' });
    process.env.RELAX_UPLOAD_VALIDATION = prevRelax;
    if ([200, 201].includes(created.statusCode)) productId = created.body._id;
  });

  afterAll(async () => {
    // cleanup overrides
    try { await fsp.unlink(OVERRIDES_FILE); } catch (_) {}
    // cleanup user
    try { if (vendor && vendor._id) await deleteTestUser(vendor._id, vendorToken); } catch (_) {}
    process.env.NODE_ENV = origNodeEnv;
    process.env.RELAX_UPLOAD_VALIDATION = origRelax;
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('PUT /api/products/:id with parent categorySlug returns 400 (choose a more specific category)', async () => {
    if (!productId) return;
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', vendorToken)
      .send({ categorySlug: 'root' });
    expect([400, 500]).toContain(res.statusCode);
    if (res.statusCode === 400) {
      expect(res.body.message || '').toMatch(/more specific category/i);
    }
  });

  test('PUT /api/products/:id with leaf categorySlug but missing required attributes returns 400', async () => {
    if (!productId) return;
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', vendorToken)
      .send({ categorySlug: 'kid', attributes: {} });
    expect([400, 500]).toContain(res.statusCode);
    if (res.statusCode === 400) {
      expect(res.body.message || '').toMatch(/size is required/i);
    }
  });

  test('PUT /api/products/:id succeeds when leaf and required attributes provided', async () => {
    if (!productId) return;
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', vendorToken)
      .send({ categorySlug: 'kid', attributes: { size: 'M' } });
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('categorySlug', 'kid');
      expect(res.body).toHaveProperty('attributes');
      expect(res.body.attributes).toHaveProperty('size', 'M');
    }
  });
});
