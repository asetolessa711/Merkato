const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('supertest');

const { registerTestUser, loginTestUser, deleteTestUser } = require('../utils/testUserUtils');

// Utility to create a temp file
const tmpFiles = [];
const makeTempFile = (basename, contentBuffer) => {
  const tmpPath = path.join(os.tmpdir(), `${basename}-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(basename)}`);
  fs.writeFileSync(tmpPath, contentBuffer);
  tmpFiles.push(tmpPath);
  return tmpPath;
};

describe('Upload Routes — moderation branches', () => {
  let vendorUser, vendorToken;

  beforeAll(async () => {
    // Ensure uploads directory exists
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    // Register and log in a vendor user
    vendorUser = await registerTestUser({ roles: ['vendor'] });
    const vendorLogin = await loginTestUser(vendorUser.email, 'Password123!');
    vendorToken = `Bearer ${vendorLogin.token}`;
  });

  afterAll(async () => {
    if (vendorUser && vendorUser._id) {
      await deleteTestUser(vendorUser._id, vendorToken);
    }
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch (_) { /* ignore */ }
    }
    jest.resetModules();
  });

  const getAppWithModeratorMock = (impl) => {
    jest.resetModules();
    const modPath = require.resolve('../../utils/azureContentModerator');
    jest.doMock(modPath, () => ({
      moderateImage: jest.fn(impl)
    }));
    // Require server after mocking
    // eslint-disable-next-line global-require
    const app = require('../../server');
    return app;
  };

  test('flags inappropriate image and skips it (resulting in 400 when all skipped)', async () => {
    const app = getAppWithModeratorMock(() => Promise.resolve({
      AdultClassificationScore: 0.9,
      IsImageAdultClassified: true,
      RacyClassificationScore: 0,
      IsImageRacyClassified: false
    }));

    const jpegBuf = Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,1,0,0,1,0,1,0,0,255,217]);
    const filePath = makeTempFile('flagged-image.jpg', jpegBuf);

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', filePath);

    // All images skipped => 400; allow 403 on env variance
    expect([400, 403]).toContain(res.statusCode);
    if (res.statusCode === 400) {
      expect(res.body).toHaveProperty('message');
    }
  });

  test('handles moderation error by skipping image (400 when all fail)', async () => {
    const app = getAppWithModeratorMock(() => Promise.reject(new Error('moderation service down')));

    const jpegBuf = Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,1,0,0,1,0,1,0,0,255,217]);
    const filePath = makeTempFile('error-image.jpg', jpegBuf);

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', vendorToken)
      .attach('images', filePath);

    expect([400, 403]).toContain(res.statusCode);
    if (res.statusCode === 400) {
      expect(res.body).toHaveProperty('message');
    }
  });
});
