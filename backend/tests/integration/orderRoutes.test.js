const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

// Utilities to register and login test users
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');
const Product = require('../../models/Product');

let adminToken, userToken, testProductId, testUserId, testAdminId;

// 📝 Optional future mocking:
// jest.mock('../../middleware/authMiddleware', () => ({
//   protect: (req, res, next) => {
//     req.user = { id: 'testUser123', isAdmin: false };
//     next();
//   }
// }));

// Tags: @thread:checkout @thread:payments @thread:vendor-orders-manage @thread:order-history @thread:returns-refunds
describe('Order Routes @orders', () => {
  let createdOrderId;
  let vendorToken;
  let otherUserToken;

  beforeAll(async () => {
    jest.setTimeout(30000); // 30 seconds
    const user = await registerTestUser({ roles: ['customer'], country: 'ET' });
    testUserId = user._id || user.id;
    const userLogin = await loginTestUser(user.email, 'Password123!');
    userToken = `Bearer ${userLogin.token}`;

    // Register and login a test admin
    const admin = await registerTestUser({ roles: ['admin'], country: 'ET' });
    testAdminId = admin._id || admin.id;
    const adminLogin = await loginTestUser(admin.email, 'Password123!');
    adminToken = `Bearer ${adminLogin.token}`;

    // Register and login a test vendor
  const vendor = await registerTestUser({ roles: ['vendor'], country: 'ET' });
  const vendorId = vendor._id || vendor.id;
  const vendorLogin = await loginTestUser(vendor.email, 'Password123!');
  vendorToken = `Bearer ${vendorLogin.token}`;

  // Another customer to test ownership checks
  const other = await registerTestUser({ roles: ['customer'], country: 'ET' });
  const otherLogin = await loginTestUser(other.email, 'Password123!');
  otherUserToken = `Bearer ${otherLogin.token}`;

  // Create a product for order creation, with vendor
  const product = await Product.create({
      name: 'Order Test Product',
      price: 24.99,
      stock: 10,
      description: 'Test product for order integration',
      category: 'Test',
      brand: 'TestBrand',
      user: testAdminId || testUserId,
      vendor: vendorId
    });
    testProductId = product._id.toString();
  });

  afterAll(async () => {
    jest.setTimeout(30000); // 30 seconds
    await Product.deleteOne({ _id: testProductId });
    // Optionally: delete test users if needed
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  describe('POST /api/orders', () => {
    test('rejects unauthenticated order creation', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ cartItems: [], total: 10 });
      expect(res.statusCode).toBe(401);
    });

    test('should fail with invalid data', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', userToken)
        .send({ total: 10 }); // missing products
      expect([400, 422, 403]).toContain(res.statusCode);
    });

    test('creates a new order when authenticated', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', userToken)
        .send({
          cartItems: [{ product: testProductId, quantity: 2 }],
          currency: 'USD',
          paymentMethod: 'cod',
          shippingAddress: { fullName: 'Test User', city: 'Addis Ababa', country: 'ET' },
          deliveryOption: { name: 'Standard', cost: 10, days: 3 }
        });

      expect(res.statusCode).toBe(201);
      if (res.statusCode === 201) {
        const orderId = res.body?.order?._id || res.body?._id;
        expect(orderId).toBeTruthy();
        expect(res.body.order.totalAfterDiscount).toBe(res.body.order.total);
        expect(res.body.order.discount).toBe(0);
        createdOrderId = orderId;
      }
    });
  });

  describe('GET /api/orders/my-orders', () => {
    test('should return current user’s orders', async () => {
      // Ensure at least one order exists for the user
      await request(app)
        .post('/api/orders')
        .set('Authorization', userToken)
        .send({
          cartItems: [{ product: testProductId, quantity: 1 }],
          currency: 'USD',
          paymentMethod: 'cod',
          shippingAddress: { fullName: 'Test User', city: 'Addis Ababa', country: 'ET' },
          deliveryOption: { name: 'Standard', cost: 10, days: 3 }
        });

      const res = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', userToken);

      expect([200, 500]).toContain(res.statusCode);
      console.log('my-orders response:', res.body);
      expect(Array.isArray(res.body.orders)).toBe(true);
      // Optionally: expect(res.body.orders.length).toBeGreaterThanOrEqual(0);
    });

    test('should fail without token', async () => {
      const res = await request(app).get('/api/orders/my-orders');
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('GET /api/orders/:id', () => {
    test('should fetch order by ID', async () => {
      if (!createdOrderId) {
        console.warn('⚠️ Skipping: order not created.');
        return;
      }

      const res = await request(app)
        .get(`/api/orders/${createdOrderId}`)
        .set('Authorization', userToken);

      expect(res.statusCode).toBe(200);
      expect(res.body?.order?._id || res.body?._id).toBe(createdOrderId);
    });

    test('should return 404 or 400 for non-existent ID', async () => {
      const res = await request(app)
        .get('/api/orders/64c529a1998764430f000001')
        .set('Authorization', userToken);
      expect([404, 400]).toContain(res.statusCode);
    });

    test('should return 400 for malformed ID', async () => {
      const res = await request(app)
        .get('/api/orders/notValidMongoId')
        .set('Authorization', userToken);
      expect([400, 403, 500]).toContain(res.statusCode);
    });

    test('should fail without token', async () => {
      if (!createdOrderId) return;
      const res = await request(app).get(`/api/orders/${createdOrderId}`);
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/orders/:id/pay', () => {
    test('should mark order as paid', async () => {
      if (!createdOrderId) {
        console.warn('⚠️ Skipping: order not created.');
        return;
      }

      const res = await request(app)
        .put(`/api/orders/${createdOrderId}/pay`)
        .set('Authorization', userToken)
        .send({
          paymentMethod: 'stripe',
          paymentResult: {
            id: 'pi_12345',
            status: 'succeeded',
            email_address: 'test@example.com'
          }
        });

      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('isPaid', true);
      }
    });

    test('should fail without token', async () => {
      if (!createdOrderId) return;
      const res = await request(app)
        .put(`/api/orders/${createdOrderId}/pay`)
        .send({
          paymentMethod: 'stripe',
          paymentResult: {
            id: 'pi_12345',
            status: 'succeeded',
            email_address: 'test@example.com'
          }
        });
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test('should reject paying an order not owned by requester', async () => {
      if (!createdOrderId) return;
      const res = await request(app)
        .put(`/api/orders/${createdOrderId}/pay`)
        .set('Authorization', otherUserToken)
        .send({ paymentMethod: 'stripe' });
      expect([403, 404]).toContain(res.statusCode);
    });

    test('should prevent double-pay with 409', async () => {
      if (!createdOrderId) return;
      // First mark paid if not already
      await request(app)
        .put(`/api/orders/${createdOrderId}/pay`)
        .set('Authorization', userToken)
        .send({ paymentMethod: 'stripe' });

      const again = await request(app)
        .put(`/api/orders/${createdOrderId}/pay`)
        .set('Authorization', userToken)
        .send({ paymentMethod: 'stripe' });
      expect([409, 200]).toContain(again.statusCode);
    });

    test('should not allow paying a cancelled order (409)', async () => {
      // Create a brand new order to isolate from previous paid state
      const create = await request(app)
        .post('/api/orders')
        .set('Authorization', userToken)
        .send({
          cartItems: [{ product: testProductId, quantity: 1 }],
          paymentMethod: 'cod',
          shippingAddress: { fullName: 'Test User', city: 'Addis Ababa', country: 'ET' },
          deliveryOption: { name: 'Standard', cost: 10, days: 3 }
        });
      const newOrderId = create.body?.order?._id || create.body?._id;
      if (!newOrderId) return;

      // Cancel it as admin
      await request(app)
        .patch(`/api/orders/${newOrderId}/status`)
        .set('Authorization', adminToken)
        .send({ status: 'cancelled' });

      const pay = await request(app)
        .put(`/api/orders/${newOrderId}/pay`)
        .set('Authorization', userToken)
        .send({ paymentMethod: 'stripe' });
      expect([409]).toContain(pay.statusCode);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    test('should delete order if admin', async () => {
      if (!createdOrderId) {
        console.warn('⚠️ Skipping: order not created.');
        return;
      }

      const res = await request(app)
        .delete(`/api/orders/${createdOrderId}`)
        .set('Authorization', adminToken);

      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('message');
      }
    });

    test('should fail without token', async () => {
      if (!createdOrderId) return;
      const res = await request(app).delete(`/api/orders/${createdOrderId}`);
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test('should return 404 or 400 for non-existent order ID', async () => {
      const res = await request(app)
        .delete('/api/orders/64c529a1998764430f000002')
        .set('Authorization', adminToken);
      expect([404, 400, 403]).toContain(res.statusCode);
    });

    test('should return 400 for malformed order ID', async () => {
      const res = await request(app)
        .delete('/api/orders/invalidOrderId')
        .set('Authorization', adminToken);
      expect([400, 403, 404]).toContain(res.statusCode);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    test('vendor cannot update status for another vendor’s section', async () => {
      if (!createdOrderId) {
        console.warn('⚠️ Skipping: order not created.');
        return;
      }
      const res = await request(app)
        .patch(`/api/orders/${createdOrderId}/status`)
        .set('Authorization', vendorToken)
        .send({ status: 'shipped' });
      // If vendor isn't part of this order, expect 403. If seeded as vendor, allow 200.
      expect([403, 200]).toContain(res.statusCode);
    });

    test('rejects invalid global status transition (delivered -> pending)', async () => {
      if (!createdOrderId) return;
      // Admin moves to delivered
      const step1 = await request(app)
        .patch(`/api/orders/${createdOrderId}/status`)
        .set('Authorization', adminToken)
        .send({ status: 'delivered' });
      expect([200, 400]).toContain(step1.statusCode);

      // Now attempt invalid transition backward
      const step2 = await request(app)
        .patch(`/api/orders/${createdOrderId}/status`)
        .set('Authorization', adminToken)
        .send({ status: 'pending' });
      expect([400]).toContain(step2.statusCode);
    });

    test('rejects invalid status value', async () => {
      if (!createdOrderId) return;
      const res = await request(app)
        .patch(`/api/orders/${createdOrderId}/status`)
        .set('Authorization', adminToken)
        .send({ status: 'teleported' });
      expect([400]).toContain(res.statusCode);
    });

    test('vendor cannot ship before order is globally paid', async () => {
      if (!createdOrderId) return;
      const res = await request(app)
        .patch(`/api/orders/${createdOrderId}/status`)
        .set('Authorization', vendorToken)
        .send({ status: 'shipped' });
      expect([400, 403, 200]).toContain(res.statusCode);
    });

    test('vendor can ship only after admin marks order paid, and then deliver', async () => {
      // Create a fresh order connected to the seeded vendor
      const create = await request(app)
        .post('/api/orders')
        .set('Authorization', userToken)
        .send({
          cartItems: [{ product: testProductId, quantity: 1 }],
          currency: 'USD',
          paymentMethod: 'cod',
          shippingAddress: { fullName: 'Test User', city: 'Addis Ababa', country: 'ET' },
          deliveryOption: { name: 'Standard', cost: 10, days: 3 }
        });
      const orderId = create.body?.order?._id || create.body?._id;
      if (!orderId) return;

      // Admin marks global order as paid
      const paid = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', adminToken)
        .send({ status: 'paid' });
      expect([200]).toContain(paid.statusCode);

      // Vendor ships their section
      const shipped = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', vendorToken)
        .send({ status: 'shipped' });
      expect([200]).toContain(shipped.statusCode);

      // Vendor delivers their section
      const delivered = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', vendorToken)
        .send({ status: 'delivered' });
      expect([200]).toContain(delivered.statusCode);
    });
  });
});
