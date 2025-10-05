const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('supertest');

const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Upload Routes — filename sanitization and video filter branches', () => {
  const tmpFiles = [];
  const makeTemp = (name, bytes = 16) => {
    const p = path.join(os.tmpdir(), `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.writeFileSync(p, Buffer.alloc(bytes, 0x01));
    tmpFiles.push(p);
    return p;
  };

  let vendorUser, vendorToken, adminUser, adminToken, app;

  beforeAll(async () => {
    // eslint-disable-next-line global-require
    app = require('../../server');
    vendorUser = await registerTestUser({ roles: ['vendor'] });
    const v = await loginTestUser(vendorUser.email, 'Password123!');
    vendorToken = `Bearer ${v.token}`;

    adminUser = await registerTestUser({ roles: ['admin'] });
    const a = await loginTestUser(adminUser.email, 'Password123!');
    adminToken = `Bearer ${a.token}`;
  });

  afterAll(async () => {
    if (vendorUser && vendorUser._id) await deleteTestUser(vendorUser._id, vendorToken);
    if (adminUser && adminUser._id) await deleteTestUser(adminUser._id, adminToken);
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  });

  test('rejects filename with traversal or separators', async () => {
    // Use buffer attach with explicit filename to avoid platform-specific filename normalization
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]); // minimal JPEG markers
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      // Explicit dangerous filename; contentType to satisfy image filter MIME/extension
      .attach('images', jpegTiny, { filename: '..%2Fevil.jpg', contentType: 'image/jpeg' });

    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid filename/i);
  });

  test('rejects raw traversal ../evil.jpg as invalid filename', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: '../evil.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid filename/i);
  });

  test('rejects encoded backslash traversal ..%255Cevil.jpg as invalid filename', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: '..%255Cevil.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid filename/i);
  });

  test('rejects exact sentinel evil.jpg as invalid filename', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'evil.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid filename/i);
  });

  test('rejects Windows reserved base name CON.jpg as invalid filename', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'CON.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid filename/i);
  });

  test('rejects encoded %2E%2E sequence within filename', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'xx%2E%2Exx.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid filename/i);
  });

  test('rejects double-encoded forward slash ..%252Fevil.jpg as invalid filename', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: '..%252Fevil.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid filename/i);
  });

  test('rejects encoded backslash within filename good%5Cname.jpg', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'good%5Cname.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid filename/i);
  });

  test('raw nested path folder/pic.jpg may be normalized by client/Multer; server should not crash', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'folder/pic.jpg', contentType: 'image/jpeg' });
    // Depending on transport normalization and preservePath behavior, this can be accepted (200) or rejected (400).
    expect([200, 400]).toContain(res.statusCode);
  });

  test('video endpoint rejects non-video type (filter branch)', async () => {
    const notVideo = makeTemp('notvideo.txt', 64);
    const res = await request(app)
      .post('/api/upload/video')
      .set('Authorization', adminToken)
      .attach('video', notVideo, 'notvideo.txt');

    expect([400, 413]).toContain(res.statusCode);
    if (res.statusCode === 400) {
      expect(String(res.body?.message || '')).toMatch(/Only MP4 and WebM video files are allowed/i);
    }
  });

  test('rejects mixed-case sentinel EviL.jpg as invalid filename', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'EviL.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid filename/i);
  });

  test('rejects overlong filename (>200 chars) as invalid filename', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const longBase = 'a'.repeat(205);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: `${longBase}.jpg`, contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid filename/i);
  });

  test('rejects another Windows reserved base name NUL.png as invalid filename', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'NUL.png', contentType: 'image/png' });
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/Invalid filename/i);
  });
});
