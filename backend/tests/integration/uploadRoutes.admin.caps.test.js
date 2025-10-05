const request = require('supertest');
const app = require('../../server');
const { registerTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Upload Routes — admin caps (per-file/count)', () => {
  let admin;
  afterAll(async () => {
    if (admin && admin._id) {
      await deleteTestUser(admin._id, admin.token, { silent: true });
    }
  });

  test('admin: per-file too large returns 413 "File too large"', async () => {
    admin = await registerTestUser({ roles: ['admin'] });
    const token = admin.token;
    // Admin per-file limit is 20MB for images; send ~21MB buffer to trigger LIMIT_FILE_SIZE
    const twentyOneMB = Buffer.alloc(21 * 1024 * 1024, 1);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('images', twentyOneMB, 'large-one.jpg');
    expect(res.statusCode).toBe(413);
    expect(String(res.text || res.body?.message || '')).toMatch(/File too large/i);
  });

  test('admin: Too many files (13 > 12) returns 400', async () => {
    admin = await registerTestUser({ roles: ['admin'] });
    const token = admin.token;
    const tiny = Buffer.alloc(512, 1);
    let req = request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`);
    for (let i = 0; i < 13; i++) {
      req = req.attach('images', tiny, `a-${i}.jpg`);
    }
    const res = await req;
    expect(res.statusCode).toBe(400);
    expect(String(res.text || res.body?.message || '')).toMatch(/Too many files/i);
  });
});
