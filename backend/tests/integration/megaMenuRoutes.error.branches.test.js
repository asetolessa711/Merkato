const request = require('supertest');

describe('megaMenuRoutes error branches (buildTaxonomy throws)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function mockTaxonomyThrow() {
    jest.doMock('../../utils/taxonomy', () => ({
      buildTaxonomy: jest.fn().mockRejectedValue(new Error('boom')),
      filterAndSort: jest.fn().mockReturnValue([]),
      computeChildren: jest.fn().mockReturnValue({ children: new Map(), byId: new Map() }),
      getAttributesForSlug: jest.fn().mockReturnValue([]),
      getLeaves: jest.fn().mockReturnValue([]),
    }));
  }

  test('GET /api/categories/tree -> 500', async () => {
    mockTaxonomyThrow();
    const app = require('../../server');
    const res = await request(app).get('/api/categories/tree').expect(500);
    expect(res.body).toHaveProperty('message', 'Failed to build category tree');
  });

  test('GET /api/categories/nonexistent/children -> 500', async () => {
    mockTaxonomyThrow();
    const app = require('../../server');
    const res = await request(app).get('/api/categories/nonexistent/children').expect(500);
    expect(res.body).toHaveProperty('message', 'Failed to get children');
  });

  test('GET /api/categories/unknown/attributes -> 500', async () => {
    mockTaxonomyThrow();
    const app = require('../../server');
    const res = await request(app).get('/api/categories/unknown/attributes').expect(500);
    expect(res.body).toHaveProperty('message', 'Failed to get attributes');
  });

  test('GET /api/categories/leaves -> 500', async () => {
    mockTaxonomyThrow();
    const app = require('../../server');
    const res = await request(app).get('/api/categories/leaves').expect(500);
    expect(res.body).toHaveProperty('message', 'Failed to get leaf categories');
  });

  test('GET /api/categories/sitemap -> 500', async () => {
    mockTaxonomyThrow();
    const app = require('../../server');
    const res = await request(app).get('/api/categories/sitemap').expect(500);
    expect(res.body).toHaveProperty('message', 'Failed to build sitemap');
  });
});
