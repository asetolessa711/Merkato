const request = require('supertest');
const app = require('../../server');
const sharp = require('sharp');
const { registerTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Upload Routes — dimension skip (>4000px)', () => {
  let vendor;
  afterAll(async () => {
    if (vendor && vendor._id) {
      await deleteTestUser(vendor._id, vendor.token, { silent: true });
    }
  });

  test('image longer side > 4000px is skipped by policy', async () => {
    vendor = await registerTestUser({ roles: ['vendor'] });
    const token = vendor.token;
    // Create a 5000x10 PNG (longest side 5000 > 4000)
    const buf = await sharp({ create: { width: 5000, height: 10, channels: 3, background: { r: 255, g: 255, b: 255 } } })
      .png()
      .toBuffer();
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('images', buf, 'wide.png');
    // Handler skips oversize images; when all images are skipped, returns 400 No valid images uploaded
    // If derivatives or moderation paths vary, tolerate either 200 with 0 images or 400 no-valid
    if (res.statusCode === 200) {
      const images = res.body?.images || [];
      expect(Array.isArray(images)).toBe(true);
      // Expect the oversize image not to appear with dimensions populated
      expect(images.length).toBe(0);
    } else {
      expect(res.statusCode).toBe(400);
      expect(String(res.text || res.body?.message || '')).toMatch(/No valid images uploaded/i);
    }
  });
});
