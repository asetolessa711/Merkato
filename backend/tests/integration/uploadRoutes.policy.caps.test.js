const request = require('supertest');
const app = require('../../server');
const { registerTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Upload Routes — policy caps (count/total)', () => {
  let vendor;
  afterAll(async () => {
    if (vendor && vendor._id) {
      await deleteTestUser(vendor._id, vendor.token, { silent: true });
    }
  });

  test('vendor: Too many files returns 400 "Too many files"', async () => {
    vendor = await registerTestUser({ roles: ['vendor'] });
    const token = vendor.token;
    // Build 10 tiny image buffers; vendor cap is 8 per policy
    const small = Buffer.alloc(1024, 1);
    let req = request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`);
    for (let i = 0; i < 10; i++) {
      req = req.attach('images', small, `img-${i}.jpg`);
    }
    const res = await req;
    expect(res.statusCode).toBe(400);
    expect(String(res.text || res.body?.message || '')).toMatch(/Too many files/i);
  });

  test('vendor: total payload too large returns 400', async () => {
    vendor = await registerTestUser({ roles: ['vendor'] });
    const token = vendor.token;
    // Build 8 images at ~6MB each => ~48MB total, exceeding vendor total cap of 40MB
    // Stay within the maxCount (8) to avoid Multer LIMIT_UNEXPECTED_FILE and exercise total payload branch
    const sixMB = Buffer.alloc(6 * 1024 * 1024, 1);
    let req = request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`);
    for (let i = 0; i < 8; i++) {
      req = req.attach('images', sixMB, `big-${i}.jpg`);
    }
    const res = await req;
    expect(res.statusCode).toBe(400);
    expect(String(res.text || res.body?.message || '')).toMatch(/Total payload too large/i);
  });
});
