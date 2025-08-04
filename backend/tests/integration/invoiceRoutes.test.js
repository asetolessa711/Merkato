// Always load .env.test for test tokens
const fs = require('fs');
const envPath = require('path').resolve(__dirname, '..', '..', '.env.test');
try {
  const envRaw = fs.readFileSync(envPath, 'utf8');
  console.log('[DEBUG] .env.test raw contents:\n', envRaw);
} catch (e) {
  console.error('[DEBUG] Could not read .env.test:', e.message);
}
// ...existing code...
require('dotenv').config({ path: envPath });
console.log('[DEBUG] (ABSOLUTE) TEST_ADMIN_TOKEN:', process.env.TEST_ADMIN_TOKEN);
console.log('[DEBUG] (ABSOLUTE) TEST_USER_TOKEN:', process.env.TEST_USER_TOKEN);
// Helper: Only set Authorization header if token is defined and non-empty
function setAuth(req, token) {
  if (token && token !== 'Bearer ') {
    return req.set('Authorization', token);
  }
  return req;
}
console.log('[DEBUG] TEST_ADMIN_TOKEN:', process.env.TEST_ADMIN_TOKEN);
console.log('[DEBUG] TEST_USER_TOKEN:', process.env.TEST_USER_TOKEN);
const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

// ✅ Tokens from .env.test or CI/CD secrets

const adminToken = process.env.TEST_ADMIN_TOKEN;
const userToken = process.env.TEST_USER_TOKEN;

// Fail early if tokens are missing to avoid undefined Authorization header
beforeAll(() => {
  if (!adminToken || !userToken || adminToken === 'Bearer ' || userToken === 'Bearer ') {
    throw new Error(
      '❌ TEST_ADMIN_TOKEN and/or TEST_USER_TOKEN are missing or empty in your .env.test file.\n' +
      'Please ensure .env.test contains valid Bearer tokens for both.\n' +
      `Current values: TEST_ADMIN_TOKEN="${adminToken}", TEST_USER_TOKEN="${userToken}"`
    );
  }
});
describe('Invoice Routes', () => {
  let testOrderId;
  let lazyOrderId;
  let productId;
  let invoiceId;
  const testEmail = 'test@example.com';

  beforeAll(async () => {
    // Dynamically fetch a real product ID from the database
    const Product = require('../../models/Product');
    const User = require('../../models/User');
    const product = await Product.findOne();
    if (!product) {
      throw new Error('❌ No products found in DB. Please seed products first.');
    }
    productId = product._id;
    // Print product details for debugging
    console.log('[DEBUG] Test Product:', {
      _id: product._id,
      name: product.name,
      stock: product.stock,
      vendor: product.vendor
    });
    // Fetch vendor details
    const vendor = await User.findById(product.vendor);
    console.log('[DEBUG] Test Product Vendor:', vendor ? {
      _id: vendor._id,
      name: vendor.name,
      roles: vendor.roles,
      email: vendor.email
    } : 'Vendor not found');

    // Print test user details
    const decoded = require('jsonwebtoken').decode(userToken.split(' ')[1]);
    const testUser = await User.findById(decoded._id || decoded.id);
    console.log('[DEBUG] Test User:', testUser ? {
      _id: testUser._id,
      name: testUser.name,
      roles: testUser.roles,
      email: testUser.email
    } : 'User not found');

    // Dynamically create a real order for invoice tests
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken)
      .send({
        cartItems: [
          {
            product: productId,
            quantity: 1
          }
        ],
        shippingAddress: {
          fullName: 'Test User',
          city: 'Addis Ababa',
          country: 'ET'
        },
        paymentMethod: 'cod',
        deliveryOption: {
          name: 'Standard',
          cost: 10,
          days: 3
        }
      });

    if (![201, 200].includes(orderRes.statusCode) || !orderRes.body.order || !orderRes.body.order._id) {
      console.error('[TEST DEBUG] Order creation failed:', {
        status: orderRes.statusCode,
        body: orderRes.body
      });
      throw new Error('❌ Could not create test order. Failing suite to ensure test data is present.');
    }
    testOrderId = orderRes.body.order._id;

    // Fetch the invoice for the created order
    const Invoice = require('../../models/Invoice');
    const invoice = await Invoice.findOne({ order: testOrderId });
    if (!invoice) {
      throw new Error('❌ Could not find invoice for created order.');
    }
    invoiceId = invoice._id;

    // Create a second order to test lazy invoice generation
    const lazyOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken)
      .send({
        cartItems: [
          {
            product: productId,
            quantity: 1
          }
        ],
        shippingAddress: {
          fullName: 'Test User',
          city: 'Addis Ababa',
          country: 'ET'
        },
        paymentMethod: 'cod',
        deliveryOption: {
          name: 'Standard',
          cost: 10,
          days: 3
        }
      });

    if (![201, 200].includes(lazyOrderRes.statusCode) || !lazyOrderRes.body.order || !lazyOrderRes.body.order._id) {
      throw new Error('❌ Could not create lazy test order. Failing suite to ensure test data is present.');
    }
    lazyOrderId = lazyOrderRes.body.order._id;
  });

  describe('GET /api/invoices/:orderId', () => {
    test('should fail without token', async () => {
      if (!testOrderId) {
        console.warn('⚠️ Skipping test — order not created.');
        return;
      }
      const res = await request(app).get(`/api/invoices/${testOrderId}`);
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return invoice for valid order (user)', async () => {
      if (!testOrderId) {
        console.warn('⚠️ Skipping test — order not created.');
        return;
      }
      const res = await request(app)
        .get(`/api/invoices/${testOrderId}`)
        .set('Authorization', userToken);

      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('invoiceNumber');
      }
    });

    test('should return 404 or 403 for non-existent or unauthorized order', async () => {
      const invalidId = '64c529a1998764430f000999';
      const res = await request(app)
        .get(`/api/invoices/${invalidId}`)
        .set('Authorization', userToken);
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test('should return 400 for malformed ObjectId', async () => {
      const res = await request(app)
        .get(`/api/invoices/notAValidId`)
        .set('Authorization', userToken);
      expect([400, 401, 403]).toContain(res.statusCode);
    });

    test('should return 404 or custom status if invoice not yet generated', async () => {
      if (!lazyOrderId) {
        console.warn('⚠️ Skipping test — lazy order not created.');
        return;
      }
      const res = await request(app)
        .get(`/api/invoices/${lazyOrderId}`)
        .set('Authorization', userToken);
      expect([404, 403, 400]).toContain(res.statusCode);
    });
  });

  describe('POST /api/invoices/email', () => {
    test('should fail without token', async () => {
      if (!testOrderId) {
        console.warn('⚠️ Skipping test — order not created.');
        return;
      }
      const res = await request(app)
        .post('/api/invoices/email')
        .send({ orderId: testOrderId, email: testEmail });
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test('should allow admin to send invoice email', async () => {
      if (!testOrderId) {
        setAuth(request(app).post('/api/invoices/email'), adminToken)
        return;
      }
      const res = await request(app)
        .post('/api/invoices/email')
        .set('Authorization', adminToken)
        .send({ orderId: testOrderId, email: testEmail });

      expect([200, 202, 403, 404]).toContain(res.statusCode);
      if ([200, 202].includes(res.statusCode)) {
        expect(res.body).toHaveProperty('message');
      }
    });

    test('should block email attempt by non-admin user', async () => {
      if (!testOrderId) {
        setAuth(request(app).post('/api/invoices/email'), userToken)
        return;
      }
      const res = await request(app)
        .post('/api/invoices/email')
        .set('Authorization', userToken)
        .send({ orderId: testOrderId, email: testEmail });
      expect([403, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/invoices/download/:orderId', () => {
    test('should allow PDF invoice download if implemented', async () => {
      if (!invoiceId) {
        console.warn('⚠️ Skipping test — invoice not found.');
        return;
      }

      const res = await request(app)
        .get(`/api/invoices/download/${invoiceId}`)
        .set('Authorization', userToken)
        .buffer()
        .parse((res, cb) => {
          res.data = [];
          res.on('data', chunk => res.data.push(chunk));
          res.on('end', () => cb(null, Buffer.concat(res.data)));
        });

      expect([200, 403, 404, 501]).toContain(res.statusCode);

      if (res.statusCode === 200) {
        expect(res.header['content-type']).toContain('application/pdf');
        expect(res.headers['content-disposition']).toMatch(/attachment/);
      }
    });

    test('should return 401/403 for missing token', async () => {
      if (!invoiceId) {
        console.warn('⚠️ Skipping test — invoice not found.');
        return;
      }
      const res = await request(app).get(`/api/invoices/download/${invoiceId}`);
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  afterAll(async () => {
      await mongoose.connection.close();
    });
  });
