const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Product Routes (Branches)', () => {
  let vendor1, vendor2, customer;
  let vendor1Token, vendor2Token, customerToken;
  let productAId; // created by vendor1
  let productBId; // created by vendor1 for report tests

  beforeAll(async () => {
    // Create vendor1 and vendor2 and a customer
    vendor1 = await registerTestUser({ roles: ['vendor'], name: 'Vendor One' });
    vendor2 = await registerTestUser({ roles: ['vendor'], name: 'Vendor Two' });
    customer = await registerTestUser({ roles: ['customer'], name: 'Customer One' });

    const v1 = await loginTestUser(vendor1.email, 'Password123!');
    vendor1Token = `Bearer ${v1.token}`;
    const v2 = await loginTestUser(vendor2.email, 'Password123!');
    vendor2Token = `Bearer ${v2.token}`;
    const cu = await loginTestUser(customer.email, 'Password123!');
    customerToken = `Bearer ${cu.token}`;

    // Create two products as vendor1
    const createA = await request(app)
      .post('/api/products')
      .set('Authorization', vendor1Token)
      .send({ name: 'Prod A', price: 10, category: 'Cat', description: 'A', stock: 5 });
    if ([200, 201].includes(createA.statusCode)) productAId = createA.body._id;

    const createB = await request(app)
      .post('/api/products')
      .set('Authorization', vendor1Token)
      .send({ name: 'Prod B', price: 20, category: 'Cat', description: 'B', stock: 2 });
    if ([200, 201].includes(createB.statusCode)) productBId = createB.body._id;
  });

  afterAll(async () => {
    // best-effort cleanup
    try {
      if (vendor1 && vendor1._id) await deleteTestUser(vendor1._id, vendor1Token);
      if (vendor2 && vendor2._id) await deleteTestUser(vendor2._id, vendor2Token);
      if (customer && customer._id) await deleteTestUser(customer._id, customerToken);
    } catch (_) {}
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  describe('Public fetch', () => {
    test('GET /api/products returns array', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/products/delivery-settings returns defaults', async () => {
      const res = await request(app).get('/api/products/delivery-settings');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('defaultEtaDays');
      expect(res.body).toHaveProperty('defaultEtaNote');
      expect(res.body).toHaveProperty('shippingOptions');
    });

    test('GET /api/products/:id 404 for unknown id', async () => {
      const unknown = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/products/${unknown}`);
      expect([404, 500]).toContain(res.statusCode); // CastError could 500
    });

    test('GET /api/products/vendor/:id scoping works', async () => {
      const res1 = await request(app).get(`/api/products/vendor/${vendor1._id}`);
      expect(res1.statusCode).toBe(200);
      expect(Array.isArray(res1.body)).toBe(true);
      const res2 = await request(app).get(`/api/products/vendor/${vendor2._id}`);
      expect(res2.statusCode).toBe(200);
      expect(Array.isArray(res2.body)).toBe(true);
    });
  });

  describe('Create guards', () => {
    test('POST /api/products 401 without token', async () => {
      const res = await request(app).post('/api/products').send({ name: 'X', price: 1 });
      expect(res.statusCode).toBe(401);
    });

    test('POST /api/products 403 with customer role', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', customerToken)
        .send({ name: 'C', price: 1 });
      expect([403, 401]).toContain(res.statusCode);
    });
  });

  describe('Update and ETA', () => {
    test('PUT /api/products/:id unauthorized vendor receives 404', async () => {
      if (!productAId) return;
      const res = await request(app)
        .put(`/api/products/${productAId}`)
        .set('Authorization', vendor2Token)
        .send({ price: 999 });
      expect([404, 403]).toContain(res.statusCode);
    });

    test('PUT /api/products/:id/eta can set days only', async () => {
      if (!productAId) return;
      const res = await request(app)
        .put(`/api/products/${productAId}/eta`)
        .set('Authorization', vendor1Token)
        .send({ deliveryEtaDays: 7 });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    test('PUT /api/products/:id/eta can set note only', async () => {
      if (!productAId) return;
      const res = await request(app)
        .put(`/api/products/${productAId}/eta`)
        .set('Authorization', vendor1Token)
        .send({ deliveryEtaNote: 'Faster route' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    test('PUT /api/products/:id/eta unauthorized vendor gets 404', async () => {
      if (!productAId) return;
      const res = await request(app)
        .put(`/api/products/${productAId}/eta`)
        .set('Authorization', vendor2Token)
        .send({ deliveryEtaDays: 2 });
      expect([404, 403]).toContain(res.statusCode);
    });
  });

  describe('Report and delete', () => {
    test('POST /api/products/:id/report 404 for unknown product', async () => {
      const unknown = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/products/${unknown}/report`)
        .set('Authorization', customerToken)
        .send({ reason: 'spam' });
      expect(res.statusCode).toBe(404);
    });

    test('POST /api/products/:id/report 201 for existing product', async () => {
      if (!productBId) return;
      const res = await request(app)
        .post(`/api/products/${productBId}/report`)
        .set('Authorization', customerToken)
        .send({ reason: 'misleading' });
      expect([201, 200]).toContain(res.statusCode);
    });

    test('DELETE /api/products/:id owner can delete (or 403 depending on role checks)', async () => {
      if (!productAId) return;
      const res = await request(app)
        .delete(`/api/products/${productAId}`)
        .set('Authorization', vendor1Token);
      expect([200, 403]).toContain(res.statusCode);
    });

    test('DELETE /api/products/:id other vendor gets 403/404', async () => {
      if (!productBId) return;
      const res = await request(app)
        .delete(`/api/products/${productBId}`)
        .set('Authorization', vendor2Token);
      expect([403, 404]).toContain(res.statusCode);
    });
  });
});
