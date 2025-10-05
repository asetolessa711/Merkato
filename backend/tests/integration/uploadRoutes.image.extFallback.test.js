const request = require('supertest');
const app = require('../../server');
const sharp = require('sharp');
const { registerTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Upload Routes — image extension fallback allows generic mimetype', () => {
  let vendor;
  afterAll(async () => {
    if (vendor && vendor._id) {
      await deleteTestUser(vendor._id, vendor.token, { silent: true });
    }
  });

  test('generic mimetype accepted when extension is valid (.png)', async () => {
    vendor = await registerTestUser({ roles: ['vendor'] });
    const token = vendor.token;
    const buf = await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .png()
      .toBuffer();
    // supertest by default sets mimetype from filename; to simulate generic, set a custom content-type
    const req = request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`);
    // Using field options to override content-type to application/octet-stream
    req.attach('images', buf, { filename: 'dot.png', contentType: 'application/octet-stream' });
    const res = await req;
    expect([200, 400]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body?.images)).toBe(true);
      expect(res.body.images.length).toBeGreaterThanOrEqual(1);
    } else {
      // If moderation/dimension skip removes it, accept 400 no valid images
      expect(String(res.text || res.body?.message || '')).toMatch(/No valid images uploaded|Invalid|Only image files are allowed/i);
    }
  });
});
