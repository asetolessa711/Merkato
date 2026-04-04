const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const ReturnRequest = require('../../models/ReturnRequest');

describe('Returns/refunds lifecycle contract @orders @returns-refunds', () => {
  let customerToken;
  let adminToken;
  let vendorToken;
  let otherCustomerToken;

  let customerId;
  let adminId;
  let vendorId;
  let productId;

  let orderIdPrimary;
  let orderIdRejectedPath;
  let requestIdPrimary;
  let requestIdRejectedPath;

  const createOrderForBuyer = async (buyerId) => {
    const subtotal = 20;
    const tax = 3;
    const shipping = 5;
    const total = subtotal + tax + shipping;

    const order = await Order.create({
      buyer: buyerId,
      vendors: [
        {
          vendorId,
          products: [{ product: productId, quantity: 1 }],
          subtotal,
          tax,
          shipping,
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
      shippingAddress: { fullName: 'Return Customer', city: 'Addis Ababa', country: 'ET' },
      deliveryOption: { name: 'Standard', cost: 5, days: 3 },
      status: 'pending',
      orderDate: new Date(),
    });

    return order._id.toString();
  };

  beforeAll(async () => {
    jest.setTimeout(30000);

    const customer = await registerTestUser({ roles: ['customer'], country: 'ET' });
    customerId = customer._id || customer.id;
    const customerLogin = await loginTestUser(customer.email, 'Password123!');
    customerToken = `Bearer ${customerLogin.token}`;

    const otherCustomer = await registerTestUser({ roles: ['customer'], country: 'ET' });
    const otherLogin = await loginTestUser(otherCustomer.email, 'Password123!');
    otherCustomerToken = `Bearer ${otherLogin.token}`;

    const admin = await registerTestUser({ roles: ['admin'], country: 'ET' });
    adminId = admin._id || admin.id;
    const adminLogin = await loginTestUser(admin.email, 'Password123!');
    adminToken = `Bearer ${adminLogin.token}`;

    const vendor = await registerTestUser({ roles: ['vendor'], country: 'ET' });
    vendorId = vendor._id || vendor.id;
    const vendorLogin = await loginTestUser(vendor.email, 'Password123!');
    vendorToken = `Bearer ${vendorLogin.token}`;

    const product = await Product.create({
      name: 'Return Lifecycle Product',
      price: 20,
      stock: 100,
      description: 'Product for return lifecycle integration tests',
      category: 'Test',
      brand: 'TestBrand',
      user: adminId || customerId,
      vendor: vendorId,
    });
    productId = product._id.toString();

    orderIdPrimary = await createOrderForBuyer(customerId);
    orderIdRejectedPath = await createOrderForBuyer(customerId);
  });

  afterAll(async () => {
    await ReturnRequest.deleteMany({ order: { $in: [orderIdPrimary, orderIdRejectedPath] } });
    await Order.deleteMany({ _id: { $in: [orderIdPrimary, orderIdRejectedPath] } });
    await Product.deleteMany({ _id: productId });

    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('customer creates return request and status is requested', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderIdPrimary}/return-requests`)
      .set('Authorization', customerToken)
      .send({ reason: 'Damaged item' });

    expect(res.statusCode).toBe(201);
    expect(res.body?.returnRequest?.status).toBe('requested');
    expect(String(res.body?.returnRequest?.order)).toBe(orderIdPrimary);
    requestIdPrimary = res.body.returnRequest._id;
  });

  test('customer can read own requests', async () => {
    const res = await request(app)
      .get('/api/orders/return-requests/my')
      .set('Authorization', customerToken);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body?.returnRequests)).toBe(true);
    expect(res.body.returnRequests.some((r) => String(r._id) === String(requestIdPrimary))).toBe(true);
  });

  test('vendor is excluded from customer create path', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderIdPrimary}/return-requests`)
      .set('Authorization', vendorToken)
      .send({ reason: 'Vendor should not create this request' });

    expect(res.statusCode).toBe(403);
  });

  test('admin can list return requests in review surface endpoint', async () => {
    const res = await request(app)
      .get('/api/admin/orders/return-requests')
      .set('Authorization', adminToken);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body?.returnRequests)).toBe(true);
    expect(res.body.returnRequests.some((r) => String(r._id) === String(requestIdPrimary))).toBe(true);
  });

  test('invalid transition outside map returns clear 400', async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/return-requests/${requestIdPrimary}/status`)
      .set('Authorization', adminToken)
      .send({ status: 'approved' });

    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid return lifecycle transition/i);
  });

  test('valid path transitions: requested -> under_review -> approved -> refunded -> closed', async () => {
    const sequence = ['under_review', 'approved', 'refunded', 'closed'];

    for (const nextStatus of sequence) {
      const res = await request(app)
        .patch(`/api/admin/orders/return-requests/${requestIdPrimary}/status`)
        .set('Authorization', adminToken)
        .send({ status: nextStatus });

      expect(res.statusCode).toBe(200);
      expect(res.body?.returnRequest?.status).toBe(nextStatus);
    }
  });

  test('alternate valid path transitions: requested -> under_review -> rejected -> closed', async () => {
    const createRes = await request(app)
      .post(`/api/orders/${orderIdRejectedPath}/return-requests`)
      .set('Authorization', customerToken)
      .send({ reason: 'Wrong size' });

    expect(createRes.statusCode).toBe(201);
    requestIdRejectedPath = createRes.body.returnRequest._id;

    const steps = ['under_review', 'rejected', 'closed'];
    for (const nextStatus of steps) {
      const res = await request(app)
        .patch(`/api/admin/orders/return-requests/${requestIdRejectedPath}/status`)
        .set('Authorization', adminToken)
        .send({ status: nextStatus });
      expect(res.statusCode).toBe(200);
      expect(res.body?.returnRequest?.status).toBe(nextStatus);
    }
  });

  test('customer cannot perform admin transition endpoint', async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/return-requests/${requestIdPrimary}/status`)
      .set('Authorization', otherCustomerToken)
      .send({ status: 'under_review' });

    expect(res.statusCode).toBe(403);
  });
});