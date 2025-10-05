const request = require('supertest');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

/**
 * Micro-branches for uploadRoutes.js
 * - No files uploaded -> 400
 * - Unsupported image type -> 400 "Only image files are allowed"
 */
describe('Upload Routes — additional branches', () => {
  let app;
  let vendorUser;
  let vendorToken;

  beforeAll(async () => {
    // eslint-disable-next-line global-require
    app = require('../../server');
    vendorUser = await registerTestUser({ roles: ['vendor'] });
    const v = await loginTestUser(vendorUser.email, 'Password123!');
    vendorToken = `Bearer ${v.token}`;
  });

  afterAll(async () => {
    if (vendorUser && vendorUser._id) {
      await deleteTestUser(vendorUser._id, vendorToken);
    }
  });

  test('returns 400 when no files uploaded', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken);

    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/No files uploaded/i);
  });

  test('rejects unsupported image type with 400', async () => {
    const bad = Buffer.from('plain');
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', bad, { filename: 'foo.txt', contentType: 'text/plain' });

    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Only image files are allowed/i);
  });
});
