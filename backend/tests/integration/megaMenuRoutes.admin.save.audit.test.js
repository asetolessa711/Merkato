const request = require('supertest');

describe('megaMenuRoutes admin save + audit branches', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('PUT /api/admin/mega-menu succeeds and audit log is readable with limit', async () => {
    // Mock auth to allow admin access
    jest.doMock('../../middleware/authMiddleware', () => ({
      protect: (req, res, next) => { req.user = { _id: 'admin1', email: 'admin@test.com', roles: ['admin'] }; next(); },
      authorize: () => (req, res, next) => next(),
      ensureAuth: (req, res, next) => next(),
      optionalAuth: (req, res, next) => next(),
    }));

    const app = require('../../server');

    // First save with 1 category
    const menu1 = [{ title: 'A', icon: 'a', links: [] }];
    await request(app)
      .put('/api/admin/mega-menu')
      .send({ menu: menu1 })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        if (!res.body || !Array.isArray(res.body.menu)) {
          throw new Error('Expected saved menu array in response');
        }
      });

    // Second save with 2 categories to differentiate counts
    const menu2 = [
      { title: 'A', icon: 'a', links: [] },
      { title: 'B', icon: 'b', links: [{ label: 'x', to: '/x' }] },
    ];
    await request(app)
      .put('/api/admin/mega-menu')
      .send({ menu: menu2 })
      .expect(200);

    // Now read audit with limit=1; expect the latest record only
    const audit = await request(app)
      .get('/api/admin/mega-menu/audit?limit=1')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(audit.body).toBeTruthy();
    expect(Array.isArray(audit.body.entries)).toBe(true);
    expect(audit.body.entries.length).toBe(1);
    expect(audit.body.entries[0]).toHaveProperty('counts');
    expect(audit.body.entries[0].counts).toHaveProperty('categories', 2);
  });
});
