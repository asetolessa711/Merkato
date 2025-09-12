jest.setTimeout(30000);
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');
const Product = require('../../models/Product');
const Expense = require('../../models/Expense');

describe('Admin Management Routes (vendors, expenses, flags, revenue) @admin', () => {
  let adminToken;
  let countryAdminToken;
  let vendorET; // Ethiopia
  let vendorUS; // Different country
  let productId;

  beforeAll(async () => {
    // Admin and Country Admin auth
    const admin = await registerTestUser({ roles: ['admin'], country: 'ET' });
    const adminLogin = await loginTestUser(admin.email, 'Password123!');
    adminToken = `Bearer ${adminLogin.token}`;

    const countryAdmin = await registerTestUser({ roles: ['country_admin'], country: 'ET' });
    const caLogin = await loginTestUser(countryAdmin.email, 'Password123!');
    countryAdminToken = `Bearer ${caLogin.token}`;

    // Vendors in different countries for approval tests
    vendorET = await registerTestUser({ roles: ['vendor'], country: 'ET' });
    vendorUS = await registerTestUser({ roles: ['vendor'], country: 'US' });

    // Create a product with suspicious description to trigger flags
    const prod = await Product.create({
      name: 'AdminMgmt Product',
      description: 'fake deal', // triggers flag route
      price: 10,
      stock: 2,
      category: 'Test',
      brand: 'Brand',
      vendor: vendorET._id || vendorET.id,
      country: 'ET'
    });
    productId = prod._id.toString();
  });

  afterAll(async () => {
    // Best-effort cleanup of created products/expenses
    if (productId) await Product.deleteOne({ _id: productId }).catch(() => {});
    await Expense.deleteMany({ description: /AdminMgmt Test Expense/ }).catch(() => {});
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  describe('Vendors listing and approvals', () => {
    test('GET /api/admin/vendors?approved=false lists unapproved vendors', async () => {
      const res = await request(app)
        .get('/api/admin/vendors?approved=false')
        .set('Authorization', adminToken);
      expect([200]).toContain(res.statusCode);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('PUT /api/admin/vendors/:id/approve by country_admin approves same-country vendor', async () => {
      const res = await request(app)
        .put(`/api/admin/vendors/${vendorET._id || vendorET.id}/approve`)
        .set('Authorization', countryAdminToken)
        .send({ approved: true });
      expect([200]).toContain(res.statusCode);
      expect(res.body).toMatchObject({ vendorApproved: true });
    });

    test('PUT /api/admin/vendors/:id/approve blocks cross-country approval', async () => {
      const res = await request(app)
        .put(`/api/admin/vendors/${vendorUS._id || vendorUS.id}/approve`)
        .set('Authorization', countryAdminToken)
        .send({ approved: true });
      expect([403]).toContain(res.statusCode);
    });
  });

  describe('Expenses CRUD (basic)', () => {
  test('POST /api/admin/expenses creates an expense', async () => {
      const res = await request(app)
        .post('/api/admin/expenses')
        .set('Authorization', adminToken)
    .send({ title: 'AdminMgmt Test Expense', amount: 123.45, category: 'other', notes: 'seeded by test' });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
    });

    test('GET /api/admin/expenses returns list (may filter by country)', async () => {
      const res = await request(app)
        .get('/api/admin/expenses')
        .set('Authorization', adminToken);
      expect([200]).toContain(res.statusCode);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Flags and Revenue', () => {
    test('GET /api/admin/flags returns suspicious list', async () => {
      const res = await request(app)
        .get('/api/admin/flags')
        .set('Authorization', adminToken);
      expect([200]).toContain(res.statusCode);
      expect(Array.isArray(res.body)).toBe(true);
      // optional: first item structure
      if (res.body[0]) {
        expect(res.body[0]).toHaveProperty('productId');
        expect(res.body[0]).toHaveProperty('reason');
      }
    });

    test('GET /api/admin/revenue returns totals', async () => {
      const res = await request(app)
        .get('/api/admin/revenue')
        .set('Authorization', adminToken);
      expect([200]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body).toHaveProperty('productCount');
    });
  });
});
