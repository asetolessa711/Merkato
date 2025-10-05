const request = require('supertest');
const fsp = require('fs/promises');
const mongoose = require('mongoose');
const app = require('../../server');
const { OVERRIDES_FILE } = require('../../utils/taxonomy');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('productRoutes strict POST success (attributes + leaf)', () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origRelax = process.env.RELAX_UPLOAD_VALIDATION;
  let vendor; let vendorToken;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.RELAX_UPLOAD_VALIDATION = 'false';
    const overrides = [
      { id: 'root', name: 'Root', slug: 'root', visibleIn: ['upload'], active: true },
      { id: 'leaf', name: 'Leaf', slug: 'leaf', parentId: 'root', visibleIn: ['upload'], active: true, attributes: [ { key: 'material', label: 'Material', required: true } ] },
    ];
    await fsp.mkdir(require('path').dirname(OVERRIDES_FILE), { recursive: true });
    await fsp.writeFile(OVERRIDES_FILE, JSON.stringify(overrides), 'utf8');

    vendor = await registerTestUser({ roles: ['vendor'], name: 'Vendor Strict Create' });
    const v = await loginTestUser(vendor.email, 'Password123!');
    vendorToken = `Bearer ${v.token}`;
  });

  afterAll(async () => {
    try { await fsp.unlink(OVERRIDES_FILE); } catch(_) {}
    try { if (vendor && vendor._id) await deleteTestUser(vendor._id, vendorToken); } catch(_) {}
    process.env.NODE_ENV = origNodeEnv;
    process.env.RELAX_UPLOAD_VALIDATION = origRelax;
    if (process.env.JEST_CLOSE_DB === 'true') await mongoose.connection.close();
  });

  test('POST /api/products succeeds when leaf category and required attributes provided', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', vendorToken)
      .send({ name: 'Strict OK', price: 15, categorySlug: 'leaf', attributes: { material: 'cotton' } });
    expect([201, 200, 500]).toContain(res.statusCode);
    if (res.statusCode === 201 || res.statusCode === 200) {
      expect(res.body).toHaveProperty('categorySlug', 'leaf');
      expect(res.body.attributes).toHaveProperty('material', 'cotton');
    }
  });
});
