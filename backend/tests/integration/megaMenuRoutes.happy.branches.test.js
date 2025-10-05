const request = require('supertest');

describe('megaMenuRoutes happy/path branches', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('GET /api/categories/:slug/children returns children when parent exists', async () => {
    const parent = { id: 'root', slug: 'root', name: 'Root' };
    const child = { id: 'c1', slug: 'child-1', name: 'Child 1', parentId: 'root' };
    jest.doMock('../../utils/taxonomy', () => ({
      buildTaxonomy: jest.fn().mockResolvedValue({ menuDoc: { updatedAt: new Date().toISOString(), version: 1 }, categories: [parent, child] }),
      filterAndSort: jest.fn((cs) => cs),
      computeChildren: jest.fn(() => ({
        children: new Map([[parent.id, [child]]]),
        byId: new Map([[parent.id, parent], [child.id, child]]),
      })),
      getAttributesForSlug: jest.fn(() => []),
      getLeaves: jest.fn(() => []),
    }));

    const app = require('../../server');
    const res = await request(app).get('/api/categories/root/children').expect(200);
    expect(res.body).toHaveProperty('parent');
    expect(res.body.parent).toHaveProperty('slug', 'root');
    expect(Array.isArray(res.body.children)).toBe(true);
    expect(res.body.children.length).toBe(1);
    expect(res.body.children[0]).toHaveProperty('slug', 'child-1');
  });

  test('GET /api/categories/sitemap includes pathSlugs mapped from byId', async () => {
    const parent = { id: 'root', slug: 'root', name: 'Root' };
    const child = { id: 'c1', slug: 'child-1', name: 'Child 1', path: ['root'] };
    jest.doMock('../../utils/taxonomy', () => ({
      buildTaxonomy: jest.fn().mockResolvedValue({ menuDoc: { updatedAt: new Date().toISOString(), version: 1 }, categories: [parent, child] }),
      filterAndSort: jest.fn((cs) => cs),
      computeChildren: jest.fn((cs) => ({
        children: new Map([[parent.id, [child]]]),
        byId: new Map(cs.map(c => [c.id, c])),
      })),
      getAttributesForSlug: jest.fn(() => []),
      getLeaves: jest.fn(() => []),
    }));

    const app = require('../../server');
    const res = await request(app).get('/api/categories/sitemap').expect(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
    const childEntry = res.body.entries.find(e => e.slug === 'child-1');
    expect(childEntry).toBeTruthy();
    expect(childEntry).toHaveProperty('pathSlugs');
    expect(childEntry.pathSlugs).toEqual(['root']);
  });
});
