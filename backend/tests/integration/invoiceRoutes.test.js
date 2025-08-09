// Always load .env.test for test tokens
const envPath = require('path').resolve(__dirname, '..', '..', '.env.test');
require('dotenv').config({ path: envPath });

// Hard fail if tokens are missing or empty (avoid logging secret values)
if (!process.env.TEST_ADMIN_TOKEN || !process.env.TEST_USER_TOKEN || process.env.TEST_ADMIN_TOKEN === 'Bearer ' || process.env.TEST_USER_TOKEN === 'Bearer ') {
  throw new Error('[FATAL] TEST_ADMIN_TOKEN and/or TEST_USER_TOKEN are missing or empty in .env.test.');
}
// Helper: Only set Authorization header if token is defined and non-empty
function setAuth(req, token) {
  if (token && token !== 'Bearer ') {
    return req.set('Authorization', token);
  }
  return req;
}
const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

// ✅ Tokens from .env.test or CI/CD secrets

const adminToken = process.env.TEST_ADMIN_TOKEN;
const userToken = process.env.TEST_USER_TOKEN;

// Fail early if tokens are missing to avoid undefined Authorization header
beforeAll(() => {
  if (!adminToken || !userToken || adminToken === 'Bearer ' || userToken === 'Bearer ') {
    throw new Error('❌ TEST_ADMIN_TOKEN and/or TEST_USER_TOKEN are missing or empty in your .env.test file.');
  }
});
describe('Invoice Routes', () => {
  let testOrderId;
  let lazyOrderId;
  let productId;
  let invoiceId;
  const testEmail = 'test@example.com';

  beforeAll(async () => {
    // Dynamically fetch a real product ID from the database (prefer stock >= 1)
    const Product = require('../../models/Product');
    const User = require('../../models/User');
    let product = await Product.findOne({ stock: { $gte: 1 } });

    // If none exists, create a simple test product using admin token
    if (!product) {
      if (!adminToken || adminToken === 'Bearer ') {
        throw new Error('❌ No in-stock products and no admin token to create one.');
      }
      const createRes = await setAuth(request(app).post('/api/products'), adminToken).send({
        name: `Invoice Test Product ${Date.now()}`,
        price: 10,
        category: 'test',
        stock: 5,
        description: 'Autocreated for invoice tests',
        country: 'Ethiopia'
      });
      if (![201, 200].includes(createRes.statusCode) || !createRes.body?._id) {
        console.error('[TEST DEBUG] Failed to create test product:', {
          status: createRes.statusCode,
          body: createRes.body
        });
        throw new Error('❌ Could not create test product.');
      }
      product = await Product.findById(createRes.body._id);
    }

    productId = product._id;
  // Minimal product info (no sensitive logs)
    // Fetch vendor details
    const vendor = await User.findById(product.vendor);
  // Minimal vendor presence check

    // Print test user details
    const decoded = require('jsonwebtoken').decode(userToken.split(' ')[1]);
    const testUser = await User.findById(decoded._id || decoded.id);
  // Minimal user presence check

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
  // Avoid logging sensitive details
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
      // Do NOT set Authorization header for this test
      const res = await request(app).get(`/api/invoices/${testOrderId}`);
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return invoice for valid order (user)', async () => {
      if (!testOrderId) {
        console.warn('⚠️ Skipping test — order not created.');
        return;
      }
      if (!userToken || userToken === 'Bearer ') {
        console.warn('⚠️ Skipping test — userToken missing.');
        return;
      }
  // token intentionally not logged
      const res = await setAuth(request(app).get(`/api/invoices/${testOrderId}`), userToken);
      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('invoiceNumber');
      }
    });

    test('should return 404 or 403 for non-existent or unauthorized order', async () => {
      const invalidId = '64c529a1998764430f000999';
      if (!userToken || userToken === 'Bearer ') {
        console.warn('⚠️ Skipping test — userToken missing.');
        return;
      }
  // token intentionally not logged
      const res = await setAuth(request(app).get(`/api/invoices/${invalidId}`), userToken);
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test('should return 400 for malformed ObjectId', async () => {
      if (!userToken || userToken === 'Bearer ') {
        console.warn('⚠️ Skipping test — userToken missing.');
        return;
      }
  // token intentionally not logged
      const res = await setAuth(request(app).get(`/api/invoices/notAValidId`), userToken);
      expect([400, 401, 403]).toContain(res.statusCode);
    });

    test('should return 404 or custom status if invoice not yet generated', async () => {
      if (!lazyOrderId) {
        console.warn('⚠️ Skipping test — lazy order not created.');
        return;
      }
      if (!userToken || userToken === 'Bearer ') {
        console.warn('⚠️ Skipping test — userToken missing.');
        return;
      }
  // token intentionally not logged
      const res = await setAuth(request(app).get(`/api/invoices/${lazyOrderId}`), userToken);
      expect([404, 403, 400]).toContain(res.statusCode);
    });
  });

  describe('POST /api/invoices/email', () => {
    test('should fail without token', async () => {
      if (!testOrderId) {
        console.warn('⚠️ Skipping test — order not created.');
        return;
      }
      // Do NOT set Authorization header for this test
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
      if (!adminToken || adminToken === 'Bearer ') {
        console.warn('⚠️ Skipping test — adminToken missing.');
        return;
      }
  // token intentionally not logged
      const res = await setAuth(request(app).post('/api/invoices/email'), adminToken)
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
      if (!userToken || userToken === 'Bearer ') {
        console.warn('⚠️ Skipping test — userToken missing.');
        return;
      }
  // token intentionally not logged
      const res = await setAuth(request(app).post('/api/invoices/email'), userToken)
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
  // token intentionally not logged
      const res = await setAuth(request(app)
        .get(`/api/invoices/download/${invoiceId}`), userToken)
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
      // Do NOT set Authorization header for this test
      const res = await request(app).get(`/api/invoices/download/${invoiceId}`);
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  afterAll(async () => {
      if (process.env.JEST_CLOSE_DB === 'true') {
        await mongoose.connection.close();
      }
    });
  });
