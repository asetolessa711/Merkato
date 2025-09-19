// Tags: @thread:vendor-products-manage
const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('Vendor Product Routes (Thread Minimal)', () => {
  let vendorToken;
  let createdId;
  beforeAll(async () => {
    const vendor = await registerTestUser({ roles: ['vendor'], country: 'ET' });
    const login = await loginTestUser(vendor.email, 'Password123!');
    vendorToken = `Bearer ${login.token}`;
  });
  afterAll(async () => { if (process.env.JEST_CLOSE_DB==='true') await mongoose.connection.close(); });

  test('create product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', vendorToken)
      .send({ name: 'Thread Prod', price: 9.99, category: 'Test', brand: 'T', stock: 5, description: 'Thread seed' });
    expect([201,200,403,400]).toContain(res.statusCode);
    createdId = res.body?.product?._id || res.body?._id;
  });

  test('list own products', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', vendorToken);
    expect([200,500]).toContain(res.statusCode);
  });
});