const request = require('supertest');
const path = require('path');

describe('megaMenuRoutes fs/error and helper branches', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('PUT /api/admin/mega-menu succeeds even if appendAudit appendFile fails (catch branch)', async () => {
    // Bypass auth middleware for admin endpoints
    jest.doMock('../../middleware/authMiddleware', () => ({
      protect: (req, res, next) => { req.user = { _id: 'u1', email: 'admin@test.com', roles: ['admin'] }; next(); },
      authorize: () => (req, res, next) => next(),
      ensureAuth: (req, res, next) => next(),
      optionalAuth: (req, res, next) => next(),
    }));

    // Cause fs.appendFile to fail to exercise appendAudit catch path
    jest.doMock('fs/promises', () => {
      const real = jest.requireActual('fs/promises');
      return {
        ...real,
        appendFile: jest.fn().mockRejectedValue(new Error('disk full')),
      };
    });

    const app = require('../../server');
    const payload = { menu: [{ title: 'X', icon: 'x', links: [] }] };
    const res = await request(app)
      .put('/api/admin/mega-menu')
      .send(payload)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body).toHaveProperty('menu');
    expect(Array.isArray(res.body.menu)).toBe(true);
  });

  test('GET /api/categories logs empty event even if obsLog append fails (catch branch)', async () => {
    // Make taxonomy return empty lists to trigger obsLog path
    const now = new Date().toISOString();
    jest.doMock('../../utils/taxonomy', () => ({
      buildTaxonomy: jest.fn().mockResolvedValue({ menuDoc: { updatedAt: now, version: 1 }, simplified: [], categories: [] }),
      filterAndSort: jest.fn((cats) => cats),
      computeChildren: jest.fn(() => ({ children: new Map(), byId: new Map() })),
      getAttributesForSlug: jest.fn(() => []),
      getLeaves: jest.fn(() => []),
    }));

    // Force obsLog's appendFile to throw
    jest.doMock('fs/promises', () => {
      const real = jest.requireActual('fs/promises');
      return {
        ...real,
        appendFile: jest.fn().mockRejectedValue(new Error('no space')),
      };
    });

    const app = require('../../server');
    await request(app).get('/api/categories').expect(200);
  });

  test('GET /api/admin/mega-menu falls back when data file contains invalid JSON (parse catch branch)', async () => {
    // Bypass auth middleware for admin endpoints
    jest.doMock('../../middleware/authMiddleware', () => ({
      protect: (req, res, next) => { req.user = { _id: 'u1', email: 'admin@test.com', roles: ['admin'] }; next(); },
      authorize: () => (req, res, next) => next(),
      ensureAuth: (req, res, next) => next(),
      optionalAuth: (req, res, next) => next(),
    }));

    // Return invalid JSON only when reading the mega-menu.json file
    jest.doMock('fs/promises', () => {
      const real = jest.requireActual('fs/promises');
      const dataFileName = path.sep + path.join('uploads', 'mega-menu.json');
      return {
        ...real,
        readFile: jest.fn().mockImplementation(async (filePath, options) => {
          const fp = typeof filePath === 'string' ? filePath : '';
          if (fp.endsWith(dataFileName)) {
            return 'not-json';
          }
          return real.readFile(filePath, options);
        }),
      };
    });

    const app = require('../../server');
    const res = await request(app).get('/api/admin/mega-menu').expect(200);
    expect(res.body).toHaveProperty('menu');
    expect(Array.isArray(res.body.menu)).toBe(true);
  });

  test('GET /api/categories/tree uses localized label when available (labelFor branch)', async () => {
    const cats = [
      { id: 'r1', slug: 'root', name: 'Root', locales: { fr: { name: 'Racine' } } },
    ];
    jest.doMock('../../utils/taxonomy', () => ({
      buildTaxonomy: jest.fn().mockResolvedValue({ menuDoc: { updatedAt: new Date().toISOString(), version: 1 }, categories: cats }),
      filterAndSort: jest.fn((cs) => cs),
      computeChildren: jest.fn((cs) => ({ children: new Map([['r1', []]]), byId: new Map(cs.map(c => [c.id, c])) })),
      getAttributesForSlug: jest.fn(() => []),
      getLeaves: jest.fn(() => []),
    }));

    const app = require('../../server');
    const res = await request(app).get('/api/categories/tree?lang=fr').expect(200);
    expect(res.body).toHaveProperty('tree');
    expect(res.body.tree[0]).toHaveProperty('name', 'Racine');
  });
});
