const request = require('supertest');
const app = require('../../server');
const Product = require('../../models/Product');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Publish Guard', () => {
  let vendorUser, vendorToken;
  let productId;

  beforeAll(async () => {
    vendorUser = await registerTestUser({ roles: ['vendor'] });
    const login = await loginTestUser(vendorUser.email, vendorUser.password || 'Password123!');
    vendorToken = `Bearer ${login.token}`;
    // Create a product directly via model for stability
    const p = await Product.create({
      name: 'Guarded Product',
      price: 10,
      vendor: vendorUser._id,
      category: 'Test',
      currency: 'USD',
      gallery: [],
    });
    productId = p._id.toString();
  });

  afterAll(async () => {
    if (productId) {
      try { await Product.deleteOne({ _id: productId }); } catch(_) {}
    }
    if (vendorUser?._id) {
      await deleteTestUser(vendorUser._id, vendorToken);
    }
  });

  it('blocks publish with 0 approved images', async () => {
    const res = await request(app)
      .post(`/api/products/${productId}/publish`)
      .set('Authorization', vendorToken);
    expect(res.statusCode).toBe(400);
    expect(String(res.body.message || '')).toMatch(/at least one approved image/i);
  });

  it('allows publish with 1 approved and returns warning when <3', async () => {
    // Add one approved image
    await Product.updateOne({ _id: productId }, {
      $set: {
        gallery: [{
          urlOriginal: '/uploads/fake.jpg',
          moderation: { status: 'approved' },
        }]
      }
    });
    const res = await request(app)
      .post(`/api/products/${productId}/publish`)
      .set('Authorization', vendorToken);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.warnings)).toBe(true);
    expect(res.body.warnings.join(' ')).toMatch(/at least 3 approved images/i);
  });
});
