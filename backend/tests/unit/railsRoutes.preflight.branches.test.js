const request = require('supertest');
const app = require('../../server');
const { registerTestUser } = require('../utils/testUserUtils');

describe('railsRoutes preflight warnings branches', () => {
  let admin;
  beforeAll(async () => {
    admin = await registerTestUser({ role: 'admin' });
  });

  test('emits warnings for min/max and caps + missing targeting', async () => {
    const body = {
      capacity: { maxItems: 1, minItems: 3, sponsoredSessionCap: 1, siteSponsoredCap: 0, requireTargeting: true },
      items: [
        { sku: 'A', reason: 'sponsored' },
        { sku: 'B', reason: 'sponsored' }
      ]
    };
    const res = await request(app)
      .post('/api/admin/rails/preflight')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(body)
      .expect(200);
    const warnings = res.body && res.body.warnings || [];
    expect(warnings).toEqual(expect.arrayContaining([
      'BELOW_MIN_ITEMS',
      'OVER_MAX_ITEMS',
      'SPONSORED_OVER_PER_RAIL_CAP',
      'SPONSORED_OVER_SITE_CAP',
      'MISSING_TARGETING'
    ]));
    expect(res.body.ok).toBe(true); // no failOnWarnings
  });
});
