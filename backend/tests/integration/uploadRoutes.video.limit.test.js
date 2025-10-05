const request = require('supertest');
const app = require('../../server');
const { registerTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Upload Routes — video per-file size limit', () => {
  let admin;
  afterAll(async () => {
    if (admin && admin._id) {
      await deleteTestUser(admin._id, admin.token, { silent: true });
    }
  });

  test('admin: video > 50MB returns 413 "Video file too large"', async () => {
    admin = await registerTestUser({ roles: ['admin'] });
    const token = admin.token;
    const fiftyFiveMB = Buffer.alloc(55 * 1024 * 1024, 1);
    const res = await request(app)
      .post('/api/upload/video')
      .set('Authorization', `Bearer ${token}`)
      // Supertest sets content type from filename; ensure extension is .mp4
      .attach('video', fiftyFiveMB, 'too-big.mp4');
    expect(res.statusCode).toBe(413);
    expect(String(res.text || res.body?.message || '')).toMatch(/Video file too large/i);
  });
});
