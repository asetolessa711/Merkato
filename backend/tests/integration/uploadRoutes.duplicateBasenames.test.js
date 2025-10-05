jest.setTimeout(60000);
const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('supertest');

const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Upload Routes — duplicate client basenames handled safely', () => {
  let app;
  let vendorUser, vendorToken;
  const savedFiles = [];

  beforeAll(async () => {
    // eslint-disable-next-line global-require
    app = require('../../server');
    vendorUser = await registerTestUser({ roles: ['vendor'] });
    const v = await loginTestUser(vendorUser.email, 'Password123!');
    vendorToken = `Bearer ${v.token}`;
  });

  afterAll(async () => {
    if (vendorUser && vendorUser._id) {
      try { await deleteTestUser(vendorUser._id, vendorToken); } catch (_) {}
    }
    // Clean up any saved files we created
    for (const f of savedFiles) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  });

  const getUploadDir = () => path.join(__dirname, '..', '..', 'uploads');

  test('uploads two images with same original name without overwriting (unique server filenames)', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]); // minimal JPEG markers
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .attach('images', jpegTiny, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    expect(res.statusCode).toBe(200);
    const urls = res.body?.imageUrls || [];
    expect(urls.length).toBe(2);
    const names = urls.map(u => String(u).split('/').pop());
    // Ensure unique server-assigned filenames
    expect(names[0]).toBeTruthy();
    expect(names[1]).toBeTruthy();
    expect(names[0]).not.toEqual(names[1]);

    // Ensure both files exist under uploads/
    const dir = getUploadDir();
    names.forEach(n => {
      const p = path.join(dir, n);
      expect(fs.existsSync(p)).toBe(true);
      savedFiles.push(p);
    });
  });

  test('uploads two images with same basename differing only by case without overwriting', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'Photo.JPG', contentType: 'image/jpeg' })
      .attach('images', jpegTiny, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    expect(res.statusCode).toBe(200);
    const urls = res.body?.imageUrls || [];
    expect(urls.length).toBe(2);
    const names = urls.map(u => String(u).split('/').pop());
    expect(new Set(names).size).toBe(2);

    const dir = getUploadDir();
    names.forEach(n => {
      const p = path.join(dir, n);
      expect(fs.existsSync(p)).toBe(true);
      savedFiles.push(p);
    });
  });

  test('separate requests with same client basename save distinct server files', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const res1 = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'same.jpg', contentType: 'image/jpeg' });
    const res2 = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'same.jpg', contentType: 'image/jpeg' });
    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);
    const n1 = String(res1.body?.imageUrls?.[0] || '').split('/').pop();
    const n2 = String(res2.body?.imageUrls?.[0] || '').split('/').pop();
    expect(n1).toBeTruthy();
    expect(n2).toBeTruthy();
    expect(n1).not.toEqual(n2);
    const dir = getUploadDir();
    [n1, n2].forEach(n => {
      const p = path.join(dir, n);
      expect(fs.existsSync(p)).toBe(true);
      savedFiles.push(p);
    });
  });

  test('accepts generic mimetype with .jpg extension; rejects octet-stream with .txt', async () => {
    const jpegTiny = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const ok = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', jpegTiny, { filename: 'ok.jpg', contentType: 'application/octet-stream' });
    expect(ok.statusCode).toBe(200);
    const bad = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', Buffer.from([0x00, 0x01, 0x02]), { filename: 'bad.txt', contentType: 'application/octet-stream' });
    expect([400, 413]).toContain(bad.statusCode);
    if (bad.statusCode === 400) {
      expect(String(bad.body?.message || '')).toMatch(/Only image files are allowed/i);
    }
  });
});
