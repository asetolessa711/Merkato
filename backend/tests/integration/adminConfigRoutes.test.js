jest.setTimeout(30000);
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');
const PromoCode = require('../../models/PromoCode');

describe('Admin Config & Promo Routes @admin', () => {
  let adminToken;

  beforeAll(async () => {
    const admin = await registerTestUser({ roles: ['admin'], country: 'ET' });
    const adminLogin = await loginTestUser(admin.email, 'Password123!');
    adminToken = `Bearer ${adminLogin.token}`;
  });

  afterAll(async () => {
    // Clean any test promo codes we created
    await PromoCode.deleteMany({ code: /TEST_/ });
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  describe('Delivery Settings', () => {
    test('GET /api/admin/delivery-settings returns settings (creates default if missing)', async () => {
      const res = await request(app)
        .get('/api/admin/delivery-settings')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('defaultEtaDays');
    });

    test('PUT /api/admin/delivery-settings updates values', async () => {
      const res = await request(app)
        .put('/api/admin/delivery-settings')
        .set('Authorization', adminToken)
        .send({ defaultEtaDays: 7, defaultEtaNote: '1 week', shippingOptions: [{ name: 'Express', cost: 25 }] });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.settings).toMatchObject({ defaultEtaDays: 7, defaultEtaNote: '1 week' });
    });
  });

  describe('First-Time Discount', () => {
    test('GET /api/admin/first-time-discount returns setting (creates default)', async () => {
      const res = await request(app)
        .get('/api/admin/first-time-discount')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('active');
      expect(res.body).toHaveProperty('percentage');
    });

    test('PUT /api/admin/first-time-discount updates setting', async () => {
      const res = await request(app)
        .put('/api/admin/first-time-discount')
        .set('Authorization', adminToken)
        .send({ active: true, percentage: 15 });
      expect(res.statusCode).toBe(200);
      expect((res.body.message || '').includes('15%')).toBe(true);
    });
  });

  describe('Admin Export Summary', () => {
    test('GET /api/admin/export-summary returns CSV', async () => {
      const res = await request(app)
        .get('/api/admin/export-summary')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      expect((res.headers['content-type'] || '').includes('text/csv')).toBe(true);
      const csv = res.text || '';
      expect(csv).toContain('date');
      expect(csv).toContain('users');
      expect(csv).toContain('orders');
    });
  });

  describe('Validate Promo', () => {
    test('POST /api/admin/validate-promo returns 404 for unknown code', async () => {
      const res = await request(app)
        .post('/api/admin/validate-promo')
        .set('Authorization', adminToken)
        .send({ code: 'TEST_UNKNOWN', totalBeforeDiscount: 100 });
      expect([404]).toContain(res.statusCode);
    });

    test('POST /api/admin/validate-promo returns 400 for expired code', async () => {
      const code = 'TEST_EXPIRED';
      await PromoCode.create({ code, type: 'percentage', value: 10, isActive: true, expiresAt: new Date(Date.now() - 3600_000) });
      const res = await request(app)
        .post('/api/admin/validate-promo')
        .set('Authorization', adminToken)
        .send({ code, totalBeforeDiscount: 100 });
      expect([400]).toContain(res.statusCode);
    });

    test('POST /api/admin/validate-promo enforces min order value', async () => {
      const code = 'TEST_MIN50';
      await PromoCode.create({ code, type: 'percentage', value: 10, minOrderValue: 50, isActive: true });
      const res = await request(app)
        .post('/api/admin/validate-promo')
        .set('Authorization', adminToken)
        .send({ code, totalBeforeDiscount: 30 });
      expect([400]).toContain(res.statusCode);
    });

    test('POST /api/admin/validate-promo blocks usage when limit reached', async () => {
      const code = 'TEST_LIMIT1';
      await PromoCode.create({ code, type: 'percentage', value: 10, usageLimit: 1, usedCount: 1, isActive: true });
      const res = await request(app)
        .post('/api/admin/validate-promo')
        .set('Authorization', adminToken)
        .send({ code, totalBeforeDiscount: 100 });
      expect([400]).toContain(res.statusCode);
    });

    test('POST /api/admin/validate-promo happy path returns discount and totalAfterDiscount', async () => {
      const code = 'TEST_OK10';
      await PromoCode.create({ code, type: 'percentage', value: 10, isActive: true });
      const res = await request(app)
        .post('/api/admin/validate-promo')
        .set('Authorization', adminToken)
        .send({ code, totalBeforeDiscount: 200 });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('discount', '20.00');
      expect(res.body).toHaveProperty('totalAfterDiscount', '180.00');
    });
  });
});
