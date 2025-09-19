const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Product = require('../../models/Product');
const VendorLead = require('../../models/VendorLead');
const InviteToken = require('../../models/InviteToken');

const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

let testVendorToken;
let testUserToken;
let vendorUserId;
let normalUserId;

// 📝 Alternative approach for mocking (optional future use):
// jest.mock('../../middleware/authMiddleware', () => ({
//   protect: (req, res, next) => {
//     req.user = { id: 'vendor123', role: 'vendor', isVendor: true };
//     next();
//   }
// }));

describe('Vendor Routes @vendor', () => {
  let createdProductId;
  let otherVendorToken;


  beforeAll(async () => {
    // Register a vendor user
    const vendorReg = await registerTestUser({
      email: `vendor_${Date.now()}@example.com`,
      password: 'VendorPass123!',
      name: 'Vendor User',
      roles: ['vendor'],
      storeName: 'Test Vendor Store',
      country: 'Ethiopia'
    });
    vendorUserId = vendorReg.user ? vendorReg.user._id : vendorReg._id;
    const vendorLogin = await loginTestUser(vendorReg.email, 'VendorPass123!');
  testVendorToken = `Bearer ${vendorLogin.token}`;

    // Register a normal user
    const userReg = await registerTestUser({
      email: `user_${Date.now()}@example.com`,
      password: 'UserPass123!',
      name: 'Normal User',
      roles: ['customer'],
      country: 'Ethiopia'
    });
    normalUserId = userReg.user ? userReg.user._id : userReg._id;
    const userLogin = await loginTestUser(userReg.email, 'UserPass123!');
    testUserToken = `Bearer ${userLogin.token}`;

    // Register a second vendor for ownership negative tests
    const otherVendorReg = await registerTestUser({
      email: `vendorB_${Date.now()}@example.com`,
      password: 'VendorPass123!',
      name: 'Other Vendor',
      roles: ['vendor'],
      country: 'Ethiopia'
    });
    const otherVendorLogin = await loginTestUser(otherVendorReg.email, 'VendorPass123!');
    otherVendorToken = `Bearer ${otherVendorLogin.token}`;
  });

  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
    // Future: Clean up test DB or disconnect
    // await cleanupTestData();
    // await disconnectTestDB();
  });

  describe('GET /api/vendor/analytics', () => {
    test('should fail without token', async () => {
      const res = await request(app).get('/api/vendor/analytics');
      expect(res.statusCode).toBe(401);
    });

    test('should fail with non-vendor token', async () => {
      const res = await request(app)
        .get('/api/vendor/analytics')
        .set('Authorization', testUserToken);
      expect(res.statusCode).toBe(403);
    });

    test('should return analytics data for vendor', async () => {
      const res = await request(app)
        .get('/api/vendor/analytics')
        .set('Authorization', testVendorToken);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body).toHaveProperty('totalItemsSold');
      expect(res.body).toHaveProperty('orderCount');
      expect(res.body).toHaveProperty('uniqueCustomers');
    });
  });

  describe('GET /api/vendor/products', () => {
    test('should fail without token', async () => {
      const res = await request(app).get('/api/vendor/products');
      expect(res.statusCode).toBe(401);
    });

    test('should fail with non-vendor token', async () => {
      const res = await request(app)
        .get('/api/vendor/products')
        .set('Authorization', testUserToken);
      expect(res.statusCode).toBe(403);
    });

    test('should list products for vendor (may be empty)', async () => {
      const res = await request(app)
        .get('/api/vendor/products')
        .set('Authorization', testVendorToken);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/vendor/revenue', () => {
    test('should fail without token', async () => {
      const res = await request(app).get('/api/vendor/revenue');
      expect(res.statusCode).toBe(401);
    });

    test('should fail with non-vendor token', async () => {
      const res = await request(app)
        .get('/api/vendor/revenue')
        .set('Authorization', testUserToken);
      expect(res.statusCode).toBe(403);
    });

    test('should return revenue data for vendor', async () => {
      const res = await request(app)
        .get('/api/vendor/revenue')
        .set('Authorization', testVendorToken);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body).toHaveProperty('productCount');
    });
  });

  describe('GET /api/vendor/top-products', () => {
    test('should fail without token', async () => {
      const res = await request(app).get('/api/vendor/top-products');
      expect(res.statusCode).toBe(401);
    });

    test('should fail with non-vendor token', async () => {
      const res = await request(app)
        .get('/api/vendor/top-products')
        .set('Authorization', testUserToken);
      expect(res.statusCode).toBe(403);
    });

    test('should return top products for vendor', async () => {
      const res = await request(app)
        .get('/api/vendor/top-products')
        .set('Authorization', testVendorToken);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/vendor/top-customers', () => {
    test('should fail without token', async () => {
      const res = await request(app).get('/api/vendor/top-customers');
      expect(res.statusCode).toBe(401);
    });

    test('should fail with non-vendor token', async () => {
      const res = await request(app)
        .get('/api/vendor/top-customers')
        .set('Authorization', testUserToken);
      expect(res.statusCode).toBe(403);
    });

    test('should return top customers for vendor', async () => {
      const res = await request(app)
        .get('/api/vendor/top-customers')
        .set('Authorization', testVendorToken);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/vendor/products', () => {
    test('should allow vendor to upload product', async () => {
      const res = await request(app)
        .post('/api/vendor/products')
        .set('Authorization', testVendorToken)
        .send({
          name: 'Vendor Test Product',
          price: 45.5,
          stock: 20,
          category: 'Accessories',
          description: 'Product uploaded by vendor'
        });

      // Only accept 201 or 200 as success
      expect([201, 200]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name');
      createdProductId = res.body._id;
    });

    test('should fail for non-vendor user', async () => {
      const res = await request(app)
        .post('/api/vendor/products')
        .set('Authorization', testUserToken)
        .send({ name: 'Unauthorized Product', price: 10 });
      // Accept 403 (forbidden) or 404 (not found) as valid
      expect([403, 404]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/vendor/products/:id', () => {
    test('should 401 without token', async () => {
      if (!createdProductId) return;
      const res = await request(app)
        .put(`/api/vendor/products/${createdProductId}`)
        .send({ name: 'No Auth Change' });
      expect(res.statusCode).toBe(401);
    });

    test('should update own product', async () => {
      if (!createdProductId) return;
      const res = await request(app)
        .put(`/api/vendor/products/${createdProductId}`)
        .set('Authorization', testVendorToken)
        .send({ name: 'Updated Vendor Product', stock: 99 });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name', 'Updated Vendor Product');
      expect(res.body).toHaveProperty('stock', 99);
    });

    test('should 404 when another vendor tries to update', async () => {
      if (!createdProductId) return;
      const res = await request(app)
        .put(`/api/vendor/products/${createdProductId}`)
        .set('Authorization', otherVendorToken)
        .send({ name: 'Hijack' });
      expect([404, 403]).toContain(res.statusCode);
    });
  });


  describe('PUT /api/vendor/profile', () => {
    test('should allow vendor to update profile', async () => {
      const res = await request(app)
        .put('/api/vendor/profile')
        .set('Authorization', testVendorToken)
        .send({
          storeName: 'Updated Store Name',
          description: 'Updated store info'
        });

      expect(res.statusCode).toBe(200);
      // The backend returns a message and avatar, not storeName
      expect(res.body).toHaveProperty('message');
    });

    test('should block profile update for non-vendor', async () => {
      const res = await request(app)
        .put('/api/vendor/profile')
        .set('Authorization', testUserToken)
        .send({ storeName: 'Fake Store' });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/vendor/products/:id', () => {
    test('should delete vendor product if authorized', async () => {
      if (!createdProductId) {
        console.warn('⚠️ Skipping delete test — product not created.');
        return;
      }

      const res = await request(app)
        .delete(`/api/vendor/products/${createdProductId}`)
        .set('Authorization', testVendorToken);

      expect(res.statusCode).toBe(200);
    });

    test('should fail without token', async () => {
      if (!createdProductId) return;

      const res = await request(app)
        .delete(`/api/vendor/products/${createdProductId}`);

      expect(res.statusCode).toBe(401);
    });

    test('should return 404 or 400 for non-existent product ID', async () => {
      const fakeId = '64c529a1998764430f000abc';
      const res = await request(app)
        .delete(`/api/vendor/products/${fakeId}`)
        .set('Authorization', testVendorToken);

      expect([404, 400]).toContain(res.statusCode);
    });
  });

  describe('GET /api/vendor/public', () => {
    test('returns list of vendors (may be empty)', async () => {
      const res = await request(app).get('/api/vendor/public');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/vendor/register (onboarding lead)', () => {
    const uniqueSuffix = Date.now().toString().slice(-9);
    const baseLead = {
      business_name: 'Acme Traders',
      contact_person: 'Alice',
      phone: `+2519${uniqueSuffix}`,
      email: `lead_${uniqueSuffix}@example.com`,
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      product_category: 'Food',
      storefront_description: 'We sell snacks.',
      referral_source: 'Social',
      consent: true
    };

    test('creates a lead with 201', async () => {
      const res = await request(app).post('/api/vendor/register').send(baseLead);
      // In case of DB residue from a previous run, the first call may return 409 (duplicate).
      expect([201, 409]).toContain(res.statusCode);
      if (res.statusCode === 201) {
        expect(res.body).toHaveProperty('id');
      }
    });

    test('rejects invalid email with 422', async () => {
      const res = await request(app).post('/api/vendor/register').send({ ...baseLead, email: 'bad' });
      expect(res.statusCode).toBe(422);
    });

    test('rejects duplicate email with 409', async () => {
      // Submit again with same email
      const res = await request(app).post('/api/vendor/register').send(baseLead);
      if (res.statusCode !== 409) {
        // eslint-disable-next-line no-console
        console.warn('duplicate lead response', res.statusCode, res.body);
      }
      expect(res.statusCode).toBe(409);
    });
  });

  describe('POST /api/vendor/invite/verify', () => {
    const ensureSecret = () => {
      if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret';
    };

    test('400 when missing token', async () => {
      const res = await request(app).post('/api/vendor/invite/verify').send({});
      expect(res.statusCode).toBe(400);
    });

    test('401 when token invalid', async () => {
      const res = await request(app).post('/api/vendor/invite/verify').send({ token: 'not-a-jwt' });
      expect(res.statusCode).toBe(401);
    });

    test('404 when token not found', async () => {
      ensureSecret();
      const jwt = require('jsonwebtoken');
      const tok = jwt.sign({ leadId: new mongoose.Types.ObjectId().toString(), email: 'x@example.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      // Do NOT create InviteToken record
      const res = await request(app).post('/api/vendor/invite/verify').send({ token: tok });
      expect(res.statusCode).toBe(404);
    });

    test('410 when token already used', async () => {
      ensureSecret();
      const jwt = require('jsonwebtoken');
      const leadId = new mongoose.Types.ObjectId();
      const tok = jwt.sign({ leadId: leadId.toString(), email: 'y@example.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      await InviteToken.create({ token: tok, leadId, expiresAt: new Date(Date.now() + 3600_000), used: true, usedAt: new Date() });
      const res = await request(app).post('/api/vendor/invite/verify').send({ token: tok });
      expect(res.statusCode).toBe(410);
    });

    test('410 when token expired', async () => {
      ensureSecret();
      const jwt = require('jsonwebtoken');
      const leadId = new mongoose.Types.ObjectId();
      const tok = jwt.sign({ leadId: leadId.toString(), email: 'z@example.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      await InviteToken.create({ token: tok, leadId, expiresAt: new Date(Date.now() - 1000), used: false });
      const res = await request(app).post('/api/vendor/invite/verify').send({ token: tok });
      expect(res.statusCode).toBe(410);
    });

    test('200 when token valid and not used/expired', async () => {
      ensureSecret();
      const jwt = require('jsonwebtoken');
      const leadId = new mongoose.Types.ObjectId();
      const payload = { leadId: leadId.toString(), email: 'ok@example.com' };
      const tok = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      await InviteToken.create({ token: tok, leadId, expiresAt: new Date(Date.now() + 3600_000), used: false });
      const res = await request(app).post('/api/vendor/invite/verify').send({ token: tok });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('leadId', payload.leadId);
      expect(res.body).toHaveProperty('email', payload.email);
    });
  });

  describe('POST /api/vendor/onboarding/complete', () => {
    test('401 without token', async () => {
      const res = await request(app).post('/api/vendor/onboarding/complete');
      expect(res.statusCode).toBe(401);
    });

    test('403 for non-vendor', async () => {
      const res = await request(app)
        .post('/api/vendor/onboarding/complete')
        .set('Authorization', testUserToken);
      expect(res.statusCode).toBe(403);
    });

    test('200 for vendor and updates vendorStatus', async () => {
      const res = await request(app)
        .post('/api/vendor/onboarding/complete')
        .set('Authorization', testVendorToken);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');

      // Verify persisted state
      const decoded = require('jsonwebtoken').decode(testVendorToken.split(' ')[1]);
      const u = await User.findById(decoded.id || decoded._id);
      expect(u).toBeTruthy();
      expect(u.vendorStatus).toBe('onboarded');
    });
  });
});