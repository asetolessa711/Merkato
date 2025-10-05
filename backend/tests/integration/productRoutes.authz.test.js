const request = require('supertest');
let app = require('../../server');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('productRoutes update guard (non-owner)', () => {
  let vendorA, vendorB, authA, authB, created;

  beforeAll(async () => {
    process.env.RELAX_UPLOAD_VALIDATION = 'true';
    vendorA = await registerTestUser({ roles: ['vendor'], name: 'Vendor A' });
    const aLogin = await loginTestUser(vendorA.email, 'Password123!');
    authA = `Bearer ${aLogin.token}`;

    vendorB = await registerTestUser({ roles: ['vendor'], name: 'Vendor B' });
    const bLogin = await loginTestUser(vendorB.email, 'Password123!');
    authB = `Bearer ${bLogin.token}`;

    // Create a simple product as Vendor A
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', authA)
      .send({ name: 'A Product', price: 10, stock: 5, image: 'x.jpg' });
    expect([201, 500]).toContain(createRes.statusCode);
    if (createRes.statusCode !== 201) {
      throw new Error('Failed to create product for authz test');
    }
    created = createRes.body;
  });

  afterAll(async () => {
    try { if (vendorA?._id) await deleteTestUser(vendorA._id, authA); } catch(_) {}
    try { if (vendorB?._id) await deleteTestUser(vendorB._id, authA); } catch(_) {}
  });

  test('PUT by non-owner vendor -> 404 not authorized', async () => {
    const res = await request(app)
      .put(`/api/products/${created._id}`)
      .set('Authorization', authB)
      .send({ name: 'Hacked' });
    expect([404, 403]).toContain(res.statusCode);
    // Route currently returns 404 when not owner; accept 403 as well if logic changes
  });
});
