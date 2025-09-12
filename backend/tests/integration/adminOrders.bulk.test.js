jest.setTimeout(30000);
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');

describe('Admin Orders Bulk Endpoints @admin @orders', () => {
  let adminToken;
  let customerId;
  let vendorId;
  let productId;
  let orderId;

  beforeAll(async () => {
    // Create admin and login
    const admin = await registerTestUser({ roles: ['admin'], country: 'ET' });
    const adminLogin = await loginTestUser(admin.email, 'Password123!');
    adminToken = `Bearer ${adminLogin.token}`;

    // Create a customer and vendor
    const customer = await registerTestUser({ roles: ['customer'], country: 'ET' });
    customerId = customer._id || customer.id;
    const vendor = await registerTestUser({ roles: ['vendor'], country: 'ET' });
    vendorId = vendor._id || vendor.id;

    // Create a product tied to vendor
    const product = await Product.create({
      name: 'Bulk Admin Test Product',
      price: 20,
      stock: 5,
      description: 'For admin bulk endpoint tests',
      category: 'Test',
      brand: 'TestBrand',
      vendor: vendorId,
    });
    productId = product._id.toString();

    // Create a minimal order directly (faster & deterministic)
    const subtotal = product.price;
    const tax = Math.round(subtotal * 0.15 * 100) / 100;
    const delivery = 5;
    const total = subtotal + tax + delivery;
    const order = await Order.create({
      buyer: customerId,
      vendors: [
        {
          vendorId,
          products: [{ product: product._id, quantity: 1 }],
          subtotal,
          tax,
          discount: 0,
          total,
          status: 'pending',
        },
      ],
      total,
      totalAfterDiscount: total,
      discount: 0,
      currency: 'USD',
      paymentMethod: 'cod',
      shippingAddress: { fullName: 'Admin Bulk Buyer', city: 'Addis', country: 'ET' },
      deliveryOption: { name: 'Standard', cost: delivery, days: 3 },
      status: 'pending',
      orderDate: new Date(),
    });
    orderId = order._id.toString();
  });

  afterAll(async () => {
    // Cleanup created docs where possible
    if (orderId) await Order.deleteOne({ _id: orderId }).catch(() => {});
    if (productId) await Product.deleteOne({ _id: productId }).catch(() => {});
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('POST /api/admin/orders/bulk-status updates status and records history; non-ObjectId treated as success', async () => {
    const res = await request(app)
      .post('/api/admin/orders/bulk-status')
      .set('Authorization', adminToken)
      .send({ ids: [orderId, 'not-an-objectid'], action: 'completed' }); // maps to delivered

    expect([200]).toContain(res.statusCode);
    expect(Array.isArray(res.body.success)).toBe(true);
    expect(res.body.success).toEqual(expect.arrayContaining([orderId, 'not-an-objectid']));
    expect(Array.isArray(res.body.failed)).toBe(true);
    // Verify the order was updated to delivered (completed -> delivered mapping)
    const updated = await Order.findById(orderId).lean();
    expect(updated.status).toBe('delivered');
    expect(Array.isArray(updated.statusHistory || [])).toBe(true);
  });

  test('POST /api/admin/orders/bulk-resend-emails marks emailLog; invalid and non-existent IDs reported as failed', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/admin/orders/bulk-resend-emails')
      .set('Authorization', adminToken)
      .send({ orderIds: [orderId, 'bad-id', nonExistentId] });

    expect([200]).toContain(res.statusCode);
    expect(Array.isArray(res.body.failed)).toBe(true);
    expect(res.body.failed).toEqual(expect.arrayContaining(['bad-id', nonExistentId]));
    // orderId should not appear in failed
    expect(res.body.failed).not.toContain(orderId);

    const refreshed = await Order.findById(orderId).lean();
    expect(refreshed.emailLog?.status).toBe('sent');
  });

  test('POST /api/admin/orders/bulk-export returns CSV with header and order row', async () => {
    const res = await request(app)
      .post('/api/admin/orders/bulk-export')
      .set('Authorization', adminToken)
      .send({ orderIds: [orderId] });

    expect(res.statusCode).toBe(200);
    expect((res.headers['content-type'] || '').includes('text/csv')).toBe(true);
    const csv = res.text || '';
    expect(csv).toContain('id,total,status');
    expect(csv).toContain(orderId);
  });

  test('POST /api/admin/orders/bulk-schedule echoes payload and count', async () => {
    const payload = { ids: [orderId, 'x'], when: 'tomorrow', action: 'resend' };
    const res = await request(app)
      .post('/api/admin/orders/bulk-schedule')
      .set('Authorization', adminToken)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, when: 'tomorrow', action: 'resend', count: 2 });
  });
});
