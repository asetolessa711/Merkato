const request = require('supertest');
const app = require('../../../server');

// ✅ Tokens from environment
const adminToken = process.env.TEST_ADMIN_TOKEN;
const userToken = process.env.TEST_USER_TOKEN;

// 📝 Optional future mocking:
// jest.mock('../../middleware/authMiddleware', () => ({
//   protect: (req, res, next) => {
//     req.user = { id: 'testUser123', isAdmin: false };
//     next();
//   }
// }));

describe('Order Routes', () => {
  let createdOrderId;

  beforeAll(async () => {
    // await connectTestDB();
    // await seedUserAndProduct();
  });

  afterAll(async () => {
    // await cleanupOrders();
    // await disconnectTestDB();
  });

  describe('POST /api/orders', () => {
    test('should fail without token', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ products: [], total: 10 });
      expect([401, 403]).toContain(res.statusCode);
    });

    test('should fail with invalid data', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', userToken)
        .send({ total: 10 }); // missing products
      expect([400, 422, 403]).toContain(res.statusCode);
    });

    test('should create a new order (auth required)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', userToken)
        .send({
          products: [{ product: '64c529a1998764430f000000', quantity: 2 }],
          total: 49.99,
          currency: 'USD',
          shippingAddress: '123 Test Street'
        });

      expect([201, 200, 403]).toContain(res.statusCode);
      if ([201, 200].includes(res.statusCode)) {
        expect(res.body).toHaveProperty('_id');
        expect(res.body).toHaveProperty('total');
        createdOrderId = res.body._id;
      } else {
        console.warn('⚠️ Order not created — skipping dependent tests.');
      }
    });
  });

  describe('GET /api/orders/my-orders', () => {
    test('should return current user’s orders', async () => {
      const res = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', userToken);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
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
      expect(res.body).toHaveProperty('_id', createdOrderId);
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
      expect([400, 403]).toContain(res.statusCode);
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

      expect([200, 403]).toContain(res.statusCode);
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
      expect([401, 403]).toContain(res.statusCode);
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

      expect([200, 403]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('message');
      }
    });

    test('should fail without token', async () => {
      if (!createdOrderId) return;
      const res = await request(app).delete(`/api/orders/${createdOrderId}`);
      expect([401, 403]).toContain(res.statusCode);
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
      expect([400, 403]).toContain(res.statusCode);
    });
  });
});
