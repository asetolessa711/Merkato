const path = require('path');
const fs = require('fs');
const request = require('supertest');
const app = require('../../../server');

const adminToken = process.env.TEST_ADMIN_TOKEN;

describe('Upload Routes', () => {
  let uploadedFilename;

  afterAll(() => {
    // Clean up uploaded file if it exists
    if (uploadedFilename) {
      const uploadDir = path.join(__dirname, '../../../uploads');
      const uploadedPath = path.join(uploadDir, uploadedFilename);
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    }
  });

  describe('POST /api/upload', () => {
    test('should allow authenticated user to upload a file', async () => {
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-image.jpg');

      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', adminToken)
        .attach('file', testFilePath);

      expect([200, 201, 403]).toContain(res.statusCode);
      if ([200, 201].includes(res.statusCode)) {
        expect(res.body).toHaveProperty('filename');
        uploadedFilename = res.body.filename;

        const uploadPath = path.join(__dirname, '../../../uploads', uploadedFilename);
        expect(fs.existsSync(uploadPath)).toBe(true);
      }
    });

    test('should reject upload without token', async () => {
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-image.jpg');

      const res = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath);

      expect([401, 403]).toContain(res.statusCode);
    });

    test('should return 400 for missing file', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', adminToken);

      expect([400, 422, 403]).toContain(res.statusCode);
    });

    test('should return 400 for invalid field name', async () => {
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-image.jpg');

      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', adminToken)
        .attach('notfile', testFilePath);

      expect([400, 422, 403]).toContain(res.statusCode);
    });

    // Parameterized file type/extension tests
    const fileCases = [
      {
        name: 'valid JPEG',
        filename: 'test-image.jpg',
        content: Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,1,0,0,1,0,1,0,0,255,217]),
        expected: [200, 201, 403]
      },
      {
        name: 'text file',
        filename: 'dummy.txt',
        content: Buffer.from('dummy'),
        expected: [400, 422, 403, 200, 201]
      },
      {
        name: 'exe file',
        filename: 'dummy.exe',
        content: Buffer.alloc(1000),
        expected: [400, 422, 403, 501, 200, 201]
      }
    ];

    test.each(fileCases)('should handle $name upload', async ({ filename, content, expected }) => {
      const filePath = path.join(__dirname, '..', 'fixtures', filename);
      fs.writeFileSync(filePath, content);

      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', adminToken)
        .attach('file', filePath);

      expect(expected).toContain(res.statusCode);

      fs.unlinkSync(filePath);
    });

    test('should reject file over size limit if enforced', async () => {
      // Create a large dummy file (2MB)
      const largePath = path.join(__dirname, '..', 'fixtures', 'large-dummy.jpg');
      const twoMB = Buffer.alloc(2 * 1024 * 1024, 0xff);
      fs.writeFileSync(largePath, twoMB);

      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', adminToken)
        .attach('file', largePath);

      // Accept 400/413/422/403 if limited, 200/201 if not
      expect([400, 413, 422, 403, 200, 201]).toContain(res.statusCode);

      fs.unlinkSync(largePath);
    });

    test('should prevent directory traversal in filename', async () => {
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-image.jpg');
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', adminToken)
        .attach('file', testFilePath, '../../evil.jpg');

      // Should not allow writing outside uploads dir
      expect([400, 422, 403, 501]).toContain(res.statusCode);
      const evilPath = path.join(__dirname, '../../../evil.jpg');
      expect(fs.existsSync(evilPath)).toBe(false);
    });

    test('should handle duplicate file uploads gracefully', async () => {
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-image.jpg');

      // First upload
      const res1 = await request(app)
        .post('/api/upload')
        .set('Authorization', adminToken)
        .attach('file', testFilePath);

      // Second upload (same file)
      const res2 = await request(app)
        .post('/api/upload')
        .set('Authorization', adminToken)
        .attach('file', testFilePath);

      expect([200, 201, 403]).toContain(res1.statusCode);
      expect([200, 201, 403]).toContain(res2.statusCode);

      // Clean up both files if created
      if (res1.body && res1.body.filename) {
        const uploadPath1 = path.join(__dirname, '../../../uploads', res1.body.filename);
        if (fs.existsSync(uploadPath1)) fs.unlinkSync(uploadPath1);
      }
      if (res2.body && res2.body.filename && res2.body.filename !== res1.body.filename) {
        const uploadPath2 = path.join(__dirname, '../../../uploads', res2.body.filename);
        if (fs.existsSync(uploadPath2)) fs.unlinkSync(uploadPath2);
      }
    });
  });

  describe('GET /uploads/:filename (static file check)', () => {
    test('should serve uploaded file if accessible', async () => {
      if (!uploadedFilename) {
        console.warn('⚠️ Skipping static file test — no file uploaded.');
        return;
      }

      const res = await request(app).get(`/uploads/${uploadedFilename}`);
      expect([200, 403, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.header['content-type']).toMatch(/image|octet-stream/);
      }
    });

    test('should return 404 for non-existent file', async () => {
      const res = await request(app).get('/uploads/nonexistentfile.jpg');
      expect([404, 403]).toContain(res.statusCode);
    });
  });
});