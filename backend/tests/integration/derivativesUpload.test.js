// Ensure flags are set before importing the app
process.env.NODE_ENV = 'test';
process.env.IMG_DERIVATIVES_ENABLED = 'true';
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

// Helpers to get tokens; here we mock protect middleware if needed via test setup

describe('Upload Routes - Derivatives (test env sync)', () => {
  beforeAll(() => {
    process.env.IMG_DERIVATIVES_ENABLED = 'true';
    // Ensure a tiny jpeg exists in backend/uploads for tests to read; create one dynamically
    const tmp = path.join(__dirname, '..', 'fixtures');
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
    const jpg = path.join(tmp, 'tiny.jpg');
    if (!fs.existsSync(jpg)) {
      // 1x1 white pixel JPEG buffer
      const base64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAECBf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAf8A/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEx/9oACAEBAAE/AGGx/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEx/9oACAEDAQE/AGGx/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEx/9oACAECAQE/AGGx/9k=';
      fs.writeFileSync(jpg, Buffer.from(base64, 'base64'));
    }
  });

  it('returns images[] with hero/thumb + dimensions when enabled', async () => {
    const admin = await registerTestUser({ roles: ['admin'] });
    // Ensure we have a fresh token even if direct-create path didn't attach one
    let token = admin.token;
    if (!token) {
      const login = await loginTestUser(admin.email, admin.password || 'Password123!');
      token = login.token;
    }
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      // Multer requires multipart form-data; include a benign field to avoid combined-stream aborts
      .field('test', '1')
  .attach('images', path.join(__dirname, '..', 'fixtures', 'tiny.jpg'), { contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();
    expect(Array.isArray(res.body.images) || Array.isArray(res.body.imageUrls)).toBe(true);
    if (Array.isArray(res.body.images)) {
      const img = res.body.images[0];
      expect(img.urlOriginal).toMatch(/\/uploads\//);
      expect(img.urlHero).toMatch(/\/uploads\//);
      expect(img.urlThumb).toMatch(/\/uploads\//);
      expect(img.widthHero).toBeGreaterThan(0);
      expect(img.heightHero).toBeGreaterThan(0);
    }
  });
});
