/**
 * Integration test: Upload with derivatives enabled should return images[] with hero/thumb and sizes
 */
process.env.IMG_DERIVATIVES_ENABLED = 'true';
process.env.IMG_DERIVATIVES_SYNC_ON_UPLOAD = 'true';

const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('supertest');

const app = require('../../server');
const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

describe('Upload with derivatives (sync in test)', () => {
  let vendorToken;
  let vendorUser;
  const tmpFiles = [];

  const makeTempFile = (basename, contentBuffer) => {
    const tmpPath = path.join(os.tmpdir(), `${basename}-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(basename)}`);
    fs.writeFileSync(tmpPath, contentBuffer);
    tmpFiles.push(tmpPath);
    return tmpPath;
  };

  beforeAll(async () => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    vendorUser = await registerTestUser({ roles: ['vendor'] });
    const login = await loginTestUser(vendorUser.email, 'Password123!');
    vendorToken = `Bearer ${login.token}`;
  });

  afterAll(async () => {
    for (const f of tmpFiles) { try { fs.unlinkSync(f); } catch(_) {} }
    if (vendorUser?._id && vendorToken) {
      await deleteTestUser(vendorUser._id, vendorToken);
    }
  });

  it('returns images[] with urlHero/urlThumb and dimensions', async () => {
    // Use a valid 1x1 white JPEG buffer (base64) so Sharp can process it
    const base64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAECBf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAf8A/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEx/9oACAEBAAE/AGGx/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEx/9oACAEDAQE/AGGx/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEx/9oACAECAQE/AGGx/9k=';
    const filePath = makeTempFile('sample.jpg', Buffer.from(base64, 'base64'));

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', filePath);

    expect([200,201]).toContain(res.statusCode);
    // Must include legacy field
    expect(Array.isArray(res.body.imageUrls)).toBe(true);
    // And detailed images when sync flag is set
    expect(Array.isArray(res.body.images)).toBe(true);
    expect(res.body.images.length).toBeGreaterThanOrEqual(1);
    const first = res.body.images[0];
    expect(first).toHaveProperty('urlOriginal');
    expect(first).toHaveProperty('urlHero');
    expect(first).toHaveProperty('urlThumb');
    expect(first.widthHero || 0).toBeGreaterThan(0);
    expect(first.heightHero || 0).toBeGreaterThan(0);
    expect(first.widthThumb || 0).toBeGreaterThan(0);
    expect(first.heightThumb || 0).toBeGreaterThan(0);
  });
});
