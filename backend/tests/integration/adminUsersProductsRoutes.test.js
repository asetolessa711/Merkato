jest.setTimeout(30000);
const request = require('supertest');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');
const Product = require('../../models/Product');

describe('Admin Users & Products (country scoping) @admin', () => {
  let globalAdminToken;
  let adminETToken;
  let vendorET;
  let vendorUS;
  let etProductId;
  let usProductId;

  beforeAll(async () => {
    const globalAdmin = await registerTestUser({ roles: ['global_admin'], country: 'ET' });
    const globalLogin = await loginTestUser(globalAdmin.email, 'Password123!');
    globalAdminToken = `Bearer ${globalLogin.token}`;

    const adminET = await registerTestUser({ roles: ['admin'], country: 'ET' });
    const adminETLogin = await loginTestUser(adminET.email, 'Password123!');
    adminETToken = `Bearer ${adminETLogin.token}`;

    vendorET = await registerTestUser({ roles: ['vendor'], country: 'ET' });
    vendorUS = await registerTestUser({ roles: ['vendor'], country: 'US' });

    const etProd = await Product.create({
      name: 'Scoped ET Product',
      price: 5,
      stock: 1,
      category: 'Test',
      vendor: vendorET._id || vendorET.id,
      description: 'ET only',
    });
    etProductId = etProd._id.toString();

    const usProd = await Product.create({
      name: 'Scoped US Product',
      price: 6,
      stock: 2,
      category: 'Test',
      vendor: vendorUS._id || vendorUS.id,
      description: 'US only',
    });
    usProductId = usProd._id.toString();
  });

  afterAll(async () => {
    if (etProductId) await Product.deleteOne({ _id: etProductId }).catch(() => {});
    if (usProductId) await Product.deleteOne({ _id: usProductId }).catch(() => {});
  });

  test('GET /api/admin/users — global admin sees all, admin sees only same-country', async () => {
    const resGlobal = await request(app).get('/api/admin/users').set('Authorization', globalAdminToken);
    expect(resGlobal.statusCode).toBe(200);
    expect(Array.isArray(resGlobal.body)).toBe(true);

    const resAdminET = await request(app).get('/api/admin/users').set('Authorization', adminETToken);
    expect(resAdminET.statusCode).toBe(200);
    expect(Array.isArray(resAdminET.body)).toBe(true);
    // Every user must be ET when scoped
    if (resAdminET.body.length) {
      expect(resAdminET.body.every(u => u.country === 'ET')).toBe(true);
    }
  });

  test('GET /api/admin/products — admin (ET) only sees ET vendors products; global sees all', async () => {
    const resGlobal = await request(app).get('/api/admin/products').set('Authorization', globalAdminToken);
    expect(resGlobal.statusCode).toBe(200);
    expect(Array.isArray(resGlobal.body)).toBe(true);
    // Should include at least one of each if created
    const names = resGlobal.body.map(p => p.name);
    expect(names).toEqual(expect.arrayContaining(['Scoped ET Product', 'Scoped US Product']));

    const resAdminET = await request(app).get('/api/admin/products').set('Authorization', adminETToken);
    expect(resAdminET.statusCode).toBe(200);
    expect(Array.isArray(resAdminET.body)).toBe(true);
    const namesET = resAdminET.body.map(p => p.name);
    expect(namesET).toContain('Scoped ET Product');
    expect(namesET).not.toContain('Scoped US Product');
  });
});
