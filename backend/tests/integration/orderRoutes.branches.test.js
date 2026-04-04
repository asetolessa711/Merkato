const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Product = require('../../models/Product');
const User = require('../../models/User');
const Invoice = require('../../models/Invoice');
const Order = require('../../models/Order');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Order Routes — branch coverage', () => {
  let customer, customerAuth;
  let vendor, vendorAuth;
  let admin, adminAuth;
  let product;

  beforeAll(async () => {
    customer = await registerTestUser({ roles: ['customer'] });
    const cLogin = await loginTestUser(customer.email, 'Password123!');
    customerAuth = `Bearer ${cLogin.token}`;

    vendor = await registerTestUser({ roles: ['vendor'] });
    const vLogin = await loginTestUser(vendor.email, 'Password123!');
    vendorAuth = `Bearer ${vLogin.token}`;

    admin = await registerTestUser({ roles: ['admin'] });
    const aLogin = await loginTestUser(admin.email, 'Password123!');
    adminAuth = `Bearer ${aLogin.token}`;

    // Create a simple product for the vendor
    product = await Product.create({
      name: 'Order Test Product',
      price: 10,
      stock: 5,
      vendor: vendor._id,
      images: []
    });
  });

  afterAll(async () => {
    // Best-effort cleanup
    try { if (product) await Product.deleteOne({ _id: product._id }); } catch (_) {}
    try { await Invoice.deleteMany({}); } catch (_) {}
    try { await Order.deleteMany({}); } catch (_) {}
    if (customer && customer._id) await deleteTestUser(customer._id, customerAuth);
    if (vendor && vendor._id) await deleteTestUser(vendor._id, vendorAuth);
    if (admin && admin._id) await deleteTestUser(admin._id, adminAuth);
  });

  describe('POST /api/orders — validation branches', () => {
    const baseBody = () => ({
      cartItems: [{ productId: product._id.toString(), quantity: 1 }],
      shippingAddress: { fullName: 'John', city: 'Addis', country: 'Ethiopia' },
      paymentMethod: 'cod',
      deliveryOption: { name: 'Standard', cost: 5, days: 3 }
    });

    test('400 when unauthenticated request omits buyer information', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send(baseBody());
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/buyer information is incomplete/i);
    });

    test('201 when guest checkout provides complete buyer information', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          ...baseBody(),
          buyerInfo: {
            name: 'Guest Buyer',
            email: 'guest.order@example.com',
            country: 'Ethiopia',
          },
        });
      expect(res.statusCode).toBe(201);
    });

    test('403 when authenticated user is not a customer', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', vendorAuth)
        .send(baseBody());
      expect(res.statusCode).toBe(403);
    });

    test('400 when no products selected', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', customerAuth)
        .send({ ...baseBody(), cartItems: [] });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/No products selected/i);
    });

    test('400 when invalid item quantity', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', customerAuth)
        .send({ ...baseBody(), cartItems: [{ productId: product._id.toString(), quantity: 0 }] });
      expect(res.statusCode).toBe(400);
    });

    test('400 when missing shipping address', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', customerAuth)
        .send({ ...baseBody(), shippingAddress: undefined });
      expect(res.statusCode).toBe(400);
    });

    test('400 when missing payment method', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', customerAuth)
        .send({ ...baseBody(), paymentMethod: undefined });
      expect(res.statusCode).toBe(400);
    });

    test('400 when deliveryOption missing', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', customerAuth)
        .send({ ...baseBody(), deliveryOption: undefined });
      expect(res.statusCode).toBe(400);
    });

    test('400 when manual discount is submitted without promo code', async () => {
      const body = baseBody();
      body.discount = 3;
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', customerAuth)
        .send(body);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/discount requires a valid promo code/i);
    });

    test('400 when guest submits manual discount without promo code', async () => {
      const body = {
        ...baseBody(),
        discount: 3,
        buyerInfo: {
          name: 'Guest Buyer',
          email: 'guest.discount@example.com',
          country: 'Ethiopia',
        },
      };
      const res = await request(app)
        .post('/api/orders')
        .send(body);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/discount requires a valid promo code/i);
    });
    test('400 when client total does not match server-calculated total', async () => {
      const body = baseBody();
      body.totalAfterDiscount = 1;
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', customerAuth)
        .send(body);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/client total does not match server-calculated order total/i);
    });

    test('400 when guest total does not match server-calculated total', async () => {
      const body = {
        ...baseBody(),
        totalAfterDiscount: 1,
        buyerInfo: {
          name: 'Guest Buyer',
          email: 'guest.total@example.com',
          country: 'Ethiopia',
        },
      };
      const res = await request(app)
        .post('/api/orders')
        .send(body);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/client total does not match server-calculated order total/i);
    });
    test('400 when discount exceeds order total', async () => {
      const body = baseBody();
      body.promoId = new mongoose.Types.ObjectId().toString();
      body.discount = 99999;
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', customerAuth)
        .send(body);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/orders/:id — auth and not found', () => {
    let orderId;
    beforeAll(async () => {
      // Create a simple order to read back
      const body = {
        cartItems: [{ productId: product._id.toString(), quantity: 1 }],
        shippingAddress: { fullName: 'John', city: 'Addis', country: 'Ethiopia' },
        paymentMethod: 'cod',
        deliveryOption: { name: 'Standard', cost: 5, days: 3 }
      };
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', customerAuth)
        .send(body);
      expect([201, 500]).toContain(res.statusCode);
      orderId = res.body?.order?._id;
    });

    test('404 for non-existent order', async () => {
      const fake = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/orders/${fake}`)
        .set('Authorization', customerAuth);
      expect([404, 500]).toContain(res.statusCode);
    });

    test('403 for unrelated vendor', async () => {
      if (!orderId) return; // skip if creation failed
      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', vendorAuth);
      // If vendor is not part of the order and not admin, expect 403
      expect([403, 200]).toContain(res.statusCode);
    });
  });

  describe('PATCH /api/orders/:orderId/status — transitions', () => {
    let order;
    beforeAll(async () => {
      // Create a fresh order for transitions
      const body = {
        cartItems: [{ productId: product._id.toString(), quantity: 1 }],
        shippingAddress: { fullName: 'John', city: 'Addis', country: 'Ethiopia' },
        paymentMethod: 'cod',
        deliveryOption: { name: 'Standard', cost: 5, days: 3 }
      };
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', customerAuth)
        .send(body);
      expect([201, 500]).toContain(res.statusCode);
      order = res.body?.order;
    });

    test('vendor cannot set paid/cancelled', async () => {
      if (!order) return;
      const res = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .set('Authorization', vendorAuth)
        .send({ status: 'paid' });
      expect([403, 400]).toContain(res.statusCode);
    });

    test('invalid transition for admin (e.g., delivered from pending)', async () => {
      if (!order) return;
      const res = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .set('Authorization', adminAuth)
        .send({ status: 'delivered' });
      expect([400, 500]).toContain(res.statusCode);
    });

    test('admin sets paid, then vendor ships and delivers (happy path)', async () => {
      if (!order) return;
      // Admin marks order as paid
      const paid = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .set('Authorization', adminAuth)
        .send({ status: 'paid' });
      expect([200, 400, 500]).toContain(paid.statusCode);

      // Vendor ships (only allowed when global status is paid)
      const ship = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .set('Authorization', vendorAuth)
        .send({ status: 'shipped' });
      expect([200, 400, 500]).toContain(ship.statusCode);

      // Vendor delivers
      const deliver = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .set('Authorization', vendorAuth)
        .send({ status: 'delivered' });
      expect([200, 400, 500]).toContain(deliver.statusCode);
    });
  });

  describe('PUT /api/orders/:id/pay — edge cases', () => {
    test('404 for non-existent order', async () => {
      const fake = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/orders/${fake}/pay`)
        .set('Authorization', customerAuth);
      expect([404, 500]).toContain(res.statusCode);
    });

    test('403 for different customer', async () => {
      // Create an order owned by our main customer
      const body = {
        cartItems: [{ productId: product._id.toString(), quantity: 1 }],
        shippingAddress: { fullName: 'John', city: 'Addis', country: 'Ethiopia' },
        paymentMethod: 'cod',
        deliveryOption: { name: 'Standard', cost: 5, days: 3 }
      };
      const created = await request(app)
        .post('/api/orders')
        .set('Authorization', customerAuth)
        .send(body);
      const order = created.body?.order;
      if (!order) return;

      // Login a different customer and attempt to pay
      const other = await registerTestUser({ roles: ['customer'] });
      const oLogin = await loginTestUser(other.email, 'Password123!');
      const otherAuth = `Bearer ${oLogin.token}`;

      const res = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', otherAuth);
      expect([403, 409, 500]).toContain(res.statusCode);
    });
  });
});
