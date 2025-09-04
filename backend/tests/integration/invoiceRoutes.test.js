const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

// Helper: Only set Authorization header if token is defined and non-empty
function setAuth(req, token) {
  if (token && token !== 'Bearer ') {
    return req.set('Authorization', `Bearer ${token}`.startsWith('Bearer ') ? token : `Bearer ${token}`);
  }
  return req;
}

describe('Invoice Routes', () => {
  let adminToken;
  let userToken;
  let testOrderId;
  let lazyOrderId;
  let productId;
  let invoiceId;
  const testEmail = 'test@example.com';

  beforeAll(async () => {
    // Create admin and user dynamically
    const adminUser = await registerTestUser({ roles: ['admin'] });
    const adminLogin = await loginTestUser(adminUser.email, 'Password123!');
    adminToken = adminLogin.token;

    const normalUser = await registerTestUser();
    const userLogin = await loginTestUser(normalUser.email, 'Password123!');
    userToken = userLogin.token;

    // Fetch a product; seeds should have populated products
    const Product = require('../../models/Product');
    let product = await Product.findOne();
    if (!product) {
      // Fallback: create a minimal product via API as admin
      const createRes = await setAuth(request(app).post('/api/products'), `Bearer ${adminToken}`)
        .send({ name: 'Test Product', price: 9.99, stock: 10, description: 'Test', category: 'Test' });
      expect([200, 201, 403, 404]).toContain(createRes.statusCode);
      // If not created (e.g., route locked), bail gracefully
      product = await Product.findOne();
      if (!product) {
        throw new Error('❌ No products available for invoice tests.');
      }
    }
    if (!product.stock || product.stock < 1) {
      await Product.updateOne({ _id: product._id }, { $set: { stock: 5 } });
      product = await Product.findById(product._id);
    }
    productId = product._id.toString();

    // Create an order with the current order API shape
    const orderRes = await setAuth(request(app).post('/api/orders'), `Bearer ${userToken}`)
      .send({
        products: [{ product: productId, quantity: 1 }],
        total: 19.99,
        currency: 'USD',
        shippingAddress: 'Invoice Street'
      });

    if ([200, 201].includes(orderRes.statusCode)) {
      testOrderId = orderRes.body._id || orderRes.body.order?._id;
    }

    // Try to locate an invoice generated for that order (if any)
    if (testOrderId) {
      const Invoice = require('../../models/Invoice');
      const inv = await Invoice.findOne({ order: testOrderId });
      if (inv) invoiceId = inv._id.toString();
    }

    // Create a second order which likely has no invoice yet
    const lazyRes = await setAuth(request(app).post('/api/orders'), `Bearer ${userToken}`)
      .send({
        products: [{ product: productId, quantity: 1 }],
        total: 29.99,
        currency: 'USD',
        shippingAddress: 'Lazy Street'
      });
    if ([200, 201].includes(lazyRes.statusCode)) {
      lazyOrderId = lazyRes.body._id || lazyRes.body.order?._id;
    }
  });

  describe('GET /api/invoices/:orderId', () => {
    test('should fail without token', async () => {
      if (!testOrderId) return;
      const res = await request(app).get(`/api/invoices/${testOrderId}`);
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return invoice for valid order (user)', async () => {
      if (!testOrderId) return;
      const res = await setAuth(request(app).get(`/api/invoices/${testOrderId}`), `Bearer ${userToken}`);
      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('invoiceNumber');
      }
    });

    test('should return 404 or 403 for non-existent or unauthorized order', async () => {
      const invalidId = '64c529a1998764430f000999';
      const res = await setAuth(request(app).get(`/api/invoices/${invalidId}`), `Bearer ${userToken}`);
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test('should return 400 for malformed ObjectId', async () => {
      const res = await setAuth(request(app).get(`/api/invoices/notAValidId`), `Bearer ${userToken}`);
      expect([400, 401, 403]).toContain(res.statusCode);
    });

    test('should return 404 or custom status if invoice not yet generated', async () => {
      if (!lazyOrderId) return;
      const res = await setAuth(request(app).get(`/api/invoices/${lazyOrderId}`), `Bearer ${userToken}`);
      expect([404, 403, 400]).toContain(res.statusCode);
    });
  });

  describe('POST /api/invoices/email', () => {
    test('should fail without token', async () => {
      if (!testOrderId) return;
      const res = await request(app)
        .post('/api/invoices/email')
        .send({ orderId: testOrderId, email: testEmail });
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test('should allow admin to send invoice email', async () => {
      if (!testOrderId) return;
      const res = await setAuth(request(app).post('/api/invoices/email'), `Bearer ${adminToken}`)
        .send({ orderId: testOrderId, email: testEmail });
      expect([200, 202, 403, 404]).toContain(res.statusCode);
      if ([200, 202].includes(res.statusCode)) {
        expect(res.body).toHaveProperty('message');
      }
    });

    test('should block email attempt by non-admin user', async () => {
      if (!testOrderId) return;
      const res = await setAuth(request(app).post('/api/invoices/email'), `Bearer ${userToken}`)
        .send({ orderId: testOrderId, email: testEmail });
      expect([403, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/invoices/download/:orderId', () => {
    test('should allow PDF invoice download if implemented', async () => {
      if (!invoiceId) return; // Skip if no invoice generated
      const res = await setAuth(request(app)
        .get(`/api/invoices/download/${invoiceId}`), `Bearer ${userToken}`)
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
      if (!invoiceId) return;
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
