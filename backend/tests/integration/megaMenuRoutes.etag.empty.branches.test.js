const request = require('supertest');

describe('megaMenuRoutes ETag and empty branches', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function mockTaxonomyEmpty() {
    const now = new Date().toISOString();
    jest.doMock('../../utils/taxonomy', () => ({
      buildTaxonomy: jest.fn().mockResolvedValue({ menuDoc: { updatedAt: now, version: 1 }, simplified: [], categories: [] }),
      filterAndSort: jest.fn((cats) => cats),
      computeChildren: jest.fn(() => ({ children: new Map(), byId: new Map() })),
      getAttributesForSlug: jest.fn(() => []),
      getLeaves: jest.fn(() => []),
    }));
  }

  test('GET /api/categories returns 200 with ETag, then 304 on If-None-Match (withETag branch)', async () => {
    mockTaxonomyEmpty();
    const app = require('../../server');

    const first = await request(app).get('/api/categories').expect(200);
    const etag = first.headers['etag'];
    expect(etag).toBeTruthy();

    // Second request with If-None-Match should short-circuit with 304
    await request(app)
      .get('/api/categories')
      .set('If-None-Match', etag)
      .expect(304);
  });

  test('GET /api/categories/tree with empty data triggers empty_tree branch', async () => {
    mockTaxonomyEmpty();
    const app = require('../../server');
    const res = await request(app).get('/api/categories/tree').expect(200);
    expect(res.body).toHaveProperty('tree');
    expect(Array.isArray(res.body.tree)).toBe(true);
    expect(res.headers['x-taxonomy-version']).toBe('2');
  });

  test('GET /api/categories/tree -> 304 on If-None-Match (withETag branch)', async () => {
    mockTaxonomyEmpty();
    const app = require('../../server');
    const first = await request(app).get('/api/categories/tree').expect(200);
    const etag = first.headers['etag'];
    expect(etag).toBeTruthy();
    await request(app).get('/api/categories/tree').set('If-None-Match', etag).expect(304);
  });

  test('GET /api/categories/leaves with empty data triggers no_leaves branch', async () => {
    mockTaxonomyEmpty();
    const app = require('../../server');
    const res = await request(app).get('/api/categories/leaves').expect(200);
    expect(res.body).toHaveProperty('categories');
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  test('GET /api/categories/leaves -> 304 on If-None-Match', async () => {
    mockTaxonomyEmpty();
    const app = require('../../server');
    const first = await request(app).get('/api/categories/leaves').expect(200);
    const etag = first.headers['etag'];
    expect(etag).toBeTruthy();
    await request(app).get('/api/categories/leaves').set('If-None-Match', etag).expect(304);
  });

  test('GET /api/categories/:slug/children when parent missing returns empty children', async () => {
    mockTaxonomyEmpty();
    const app = require('../../server');
    const res = await request(app).get('/api/categories/nonexistent/children').expect(200);
    // Route returns { parent, children }; when missing, parent may be omitted/undefined.
    expect(Array.isArray(res.body.children)).toBe(true);
  });

  test('GET /api/categories/:slug/children -> 304 on If-None-Match', async () => {
    mockTaxonomyEmpty();
    const app = require('../../server');
    const first = await request(app).get('/api/categories/nonexistent/children').expect(200);
    const etag = first.headers['etag'];
    expect(etag).toBeTruthy();
    await request(app).get('/api/categories/nonexistent/children').set('If-None-Match', etag).expect(304);
  });

  test('GET /api/categories/:slug/attributes returns empty list for unknown slug', async () => {
    mockTaxonomyEmpty();
    const app = require('../../server');
    const res = await request(app).get('/api/categories/unknown/attributes').expect(200);
    expect(res.body).toHaveProperty('attributes');
    expect(Array.isArray(res.body.attributes)).toBe(true);
  });

  test('GET /api/categories/:slug/attributes -> 304 on If-None-Match', async () => {
    mockTaxonomyEmpty();
    const app = require('../../server');
    const first = await request(app).get('/api/categories/unknown/attributes').expect(200);
    const etag = first.headers['etag'];
    expect(etag).toBeTruthy();
    await request(app).get('/api/categories/unknown/attributes').set('If-None-Match', etag).expect(304);
  });

  test('GET /api/categories/sitemap -> 304 on If-None-Match', async () => {
    mockTaxonomyEmpty();
    const app = require('../../server');
    const first = await request(app).get('/api/categories/sitemap').expect(200);
    const etag = first.headers['etag'];
    expect(etag).toBeTruthy();
    await request(app).get('/api/categories/sitemap').set('If-None-Match', etag).expect(304);
  });

  test('PUT /api/admin/mega-menu -> 400 when payload missing menu array (admin invalid branch)', async () => {
    // mock auth to bypass protection
    jest.doMock('../../middleware/authMiddleware', () => ({
      protect: (req, res, next) => { req.user = { _id: 'u1', email: 'admin@test.com', roles: ['admin'] }; next(); },
      authorize: () => (req, res, next) => next(),
      ensureAuth: (req, res, next) => next(),
      optionalAuth: (req, res, next) => next(),
    }));
    const app = require('../../server');
    await request(app)
      .put('/api/admin/mega-menu')
      .send({})
      .expect(400)
      .expect('Content-Type', /json/);
  });
});
