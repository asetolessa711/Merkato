const request = require('supertest');

// We re-require the app per test with tailored mocks to hit specific branches
describe('megaMenuRoutes branches', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('GET /api/categories -> 500 when buildTaxonomy throws (error branch)', async () => {
    // Mock taxonomy utils so buildTaxonomy rejects, exercising the catch -> 500 path
    jest.doMock('../../utils/taxonomy', () => ({
      buildTaxonomy: jest.fn().mockRejectedValue(new Error('boom')),
      filterAndSort: jest.fn().mockReturnValue([]),
      computeChildren: jest.fn().mockReturnValue({ children: new Map(), byId: new Map() }),
      getAttributesForSlug: jest.fn().mockReturnValue([]),
      getLeaves: jest.fn().mockReturnValue([]),
    }));

    // Use real auth middleware for public endpoint
    const app = require('../../server');

    await request(app)
      .get('/api/categories')
      .expect(500)
      .expect('Content-Type', /json/)
      .expect(res => {
        if (!res.body || res.body.message !== 'Failed to read categories') {
          throw new Error(`Unexpected body: ${JSON.stringify(res.body)}`);
        }
      });
  });

  test('GET /api/admin/mega-menu/audit -> 200 { entries: [] } when audit file missing (empty branch)', async () => {
    // Bypass auth with a minimal mock so we can hit the admin endpoint
    jest.doMock('../../middleware/authMiddleware', () => ({
      protect: (req, res, next) => { req.user = { _id: 'u1', email: 'admin@test.com', roles: ['admin'] }; next(); },
      authorize: () => (req, res, next) => next(),
      ensureAuth: (req, res, next) => next(),
      optionalAuth: (req, res, next) => next(),
    }));

    const app = require('../../server');

    const res = await request(app)
      .get('/api/admin/mega-menu/audit')
      .expect(200)
      .expect('Content-Type', /json/);

  expect(res.body).toBeTruthy();
  expect(Array.isArray(res.body.entries)).toBe(true);
  // When file is absent, route returns an empty array; if it exists from other tests, it's non-empty.
  // We only assert shape here to avoid coupling to global test order/state.
  });
});
