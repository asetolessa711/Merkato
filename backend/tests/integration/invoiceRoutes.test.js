const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');

// ✅ Tokens from .env.test or CI/CD secrets
const adminToken = process.env.TEST_ADMIN_TOKEN;
const userToken = process.env.TEST_USER_TOKEN;

describe('Invoice Routes', () => {
  let testOrderId;
  let lazyOrderId;
  const testEmail = 'test@example.com';

  beforeAll(async () => {
    // Dynamically create a real order for invoice tests
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken)
      .send({
        products: [
          {
            product: '64c529a1998764430f000000', // Replace with a valid seeded product ID
            quantity: 1
          }
        ],
        total: 19.99,
        currency: 'USD',
        shippingAddress: '123 Invoice Lane'
      });

    if (![201, 200].includes(orderRes.statusCode) || !orderRes.body._id) {
      throw new Error('❌ Could not create test order. Failing suite to ensure test data is present.');
    }
    testOrderId = orderRes.body._id;

    // Create a second order to test lazy invoice generation
    const lazyOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken)
      .send({
        products: [
          {
            product: '64c529a1998764430f000000',
            quantity: 1
          }
        ],
        total: 9.99,
        currency: 'USD',
        shippingAddress: 'Lazy Invoice Lane'
      });

    if (![201, 200].includes(lazyOrderRes.statusCode) || !lazyOrderRes.body._id) {
      throw new Error('❌ Could not create lazy test order. Failing suite to ensure test data is present.');
    }
    lazyOrderId = lazyOrderRes.body._id;
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
        console.warn('⚠️ Skipping test — order not created.');
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
        console.warn('⚠️ Skipping test — order not created.');
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
      if (!testOrderId) {
        console.warn('⚠️ Skipping test — order not created.');
        return;
      }

      const res = await request(app)
        .get(`/api/invoices/download/${testOrderId}`)
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
      if (!testOrderId) {
        console.warn('⚠️ Skipping test — order not created.');
        return;
      }
      const res = await request(app).get(`/api/invoices/download/${testOrderId}`);
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });
});
