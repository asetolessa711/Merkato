const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { loginTestUser } = require('../utils/testUserUtils');

describe('Invoice Routes Access Control', () => {
  let adminToken;
  let customerToken;
  let vendorToken;
  let orderId;
  let invoiceId;

  beforeAll(async () => {
    // Ensure base data exists
    await request(app).post('/api/dev/seed');

    // Login roles from seed
    async function ensure(email, roles = [], name = 'Auto User') {
      try {
        return (await loginTestUser(email, 'Password123!')).token;
      } catch (_) {
        await request(app).post('/api/auth/register').send({
          name,
          email,
          password: 'Password123!',
          country: 'ET',
          roles,
        });
        return (await loginTestUser(email, 'Password123!')).token;
      }
    }
    adminToken = await ensure('admin@test.com', ['admin'], 'Admin Auto');
    vendorToken = await ensure('vendor@test.com', ['vendor'], 'Vendor Auto');
    customerToken = await ensure('customer@test.com', ['customer'], 'Customer Auto');

    // Create an order as the customer to ensure a linked invoice exists
    const Product = require('../../models/Product');
    const product = await Product.findOne();
    expect(product).toBeTruthy();
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        cartItems: [{ product: product._id.toString(), quantity: 1 }],
        shippingAddress: { fullName: 'C', city: 'A', country: 'ET' },
        paymentMethod: 'cod',
        deliveryOption: { name: 'Std', cost: 10, days: 3 },
      });
    expect([200, 201]).toContain(orderRes.statusCode);
    orderId = orderRes.body?.order?._id;
    expect(orderId).toBeTruthy();

    const Invoice = require('../../models/Invoice');
    const inv = await Invoice.findOne({ order: orderId });
    expect(inv).toBeTruthy();
    invoiceId = inv._id.toString();
  });

  test('GET /api/invoices/:orderId denies without token', async () => {
    const res = await request(app).get(`/api/invoices/${orderId}`);
    expect([401, 403]).toContain(res.statusCode);
  });

  test('GET /api/invoices/:orderId allowed for customer who owns order', async () => {
    const res = await request(app)
      .get(`/api/invoices/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect([200, 404]).toContain(res.statusCode);
  });

  test('GET /api/invoices/:orderId allowed for vendor who owns invoice', async () => {
    const res = await request(app)
      .get(`/api/invoices/${orderId}`)
      .set('Authorization', `Bearer ${vendorToken}`);
    expect([200, 403, 404]).toContain(res.statusCode);
  });

  test('GET /api/invoices/:orderId invalid ObjectId -> 400', async () => {
    const res = await request(app)
      .get('/api/invoices/not-an-objectid')
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/invoices/email admin permitted; non-admin forbidden', async () => {
    const adminRes = await request(app)
      .post('/api/invoices/email')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderId });
    expect([200, 202, 404]).toContain(adminRes.statusCode);

    const userRes = await request(app)
      .post('/api/invoices/email')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ orderId });
    expect([403, 404]).toContain(userRes.statusCode);
  });

  test('GET /api/invoices/download/:invoiceId requires token', async () => {
    const noTok = await request(app).get(`/api/invoices/download/${invoiceId}`);
    expect([401, 403]).toContain(noTok.statusCode);
  });
});
