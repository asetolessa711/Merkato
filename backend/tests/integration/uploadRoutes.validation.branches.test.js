const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('supertest');

const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Upload Routes — validation branches', () => {
  const tmpFiles = [];
  const makeTempFile = (basename, sizeBytes, contentType = 'text/plain') => {
    const p = path.join(os.tmpdir(), `${basename}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const buf = Buffer.alloc(sizeBytes, 0x41);
    fs.writeFileSync(p, buf);
    tmpFiles.push(p);
    return { filePath: p, contentType };
  };

  let vendorUser, vendorToken, app;

  beforeAll(async () => {
    // Create server late to avoid module state leakage
    // eslint-disable-next-line global-require
    app = require('../../server');
    vendorUser = await registerTestUser({ roles: ['vendor'] });
    const vendorLogin = await loginTestUser(vendorUser.email, 'Password123!');
    vendorToken = `Bearer ${vendorLogin.token}`;
  });

  afterAll(async () => {
    if (vendorUser && vendorUser._id) {
      await deleteTestUser(vendorUser._id, vendorToken);
    }
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  });

  test('rejects non-image file with 400 and message', async () => {
    const { filePath: badPath } = makeTempFile('not-an-image.txt', 32, 'text/plain');
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', badPath);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(String(res.body.message)).toMatch(/Only image files are allowed/i);
  });

  test('enforces file size limit with 413', async () => {
    // Create a ~3MB file to exceed 2MB limit
    const { filePath: bigPath } = makeTempFile('big-image.jpg', 3 * 1024 * 1024, 'image/jpeg');
    let res = null;
    let aborted = false;
    try {
      res = await request(app)
        .post('/api/upload')
        .set('Authorization', vendorToken)
        .attach('images', bigPath);
    } catch (err) {
      // Multer/Busboy may abort the request when the limit is exceeded
      aborted = true;
    }

    // Ensure no file with our marker name was written
    const uploadsDir = path.join(__dirname, '../../../uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const found = files.some(f => f.includes('big-image'));
      expect(found).toBe(false);
    }

    if (!aborted && res) {
      expect([413, 400]).toContain(res.statusCode);
      if (res.statusCode === 413) {
        expect(String(res.body.message)).toMatch(/File too large/i);
      }
    } else {
      expect(aborted).toBe(true);
    }
  });
});
