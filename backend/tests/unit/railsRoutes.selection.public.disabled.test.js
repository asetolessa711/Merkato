const request = require('supertest');
const app = require('../../server');
const RailConfig = require('../../models/RailConfig');

describe('railsRoutes public selection disabled branch', () => {
  let origFlag;
  beforeAll(() => { origFlag = process.env.RAILS_SELECTION_V1; });
  afterAll(() => { process.env.RAILS_SELECTION_V1 = origFlag; });

  test('returns ok:false when flag off', async () => {
    process.env.RAILS_SELECTION_V1 = 'false';
    await RailConfig.findByIdAndUpdate('default', { $set: { killSwitch: false, enabled: true } }, { upsert: true });
    const res = await request(app).get('/api/rails/selection').expect(200);
    expect(res.body && res.body.ok).toBe(false);
    expect(Array.isArray(res.body.selection)).toBe(true);
  });

  test('returns ok:false when killSwitch true', async () => {
    process.env.RAILS_SELECTION_V1 = 'true';
    await RailConfig.findByIdAndUpdate('default', { $set: { killSwitch: true, enabled: true } }, { upsert: true });
    const res = await request(app).get('/api/rails/selection').expect(200);
    expect(res.body && res.body.ok).toBe(false);
  });
});
