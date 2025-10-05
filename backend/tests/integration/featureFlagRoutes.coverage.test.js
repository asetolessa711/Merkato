const request = require('supertest');
const path = require('path');

// Load app fresh per test file to allow env tweaking safely
const app = require('../../server');

describe('Feature Flag Routes (coverage)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // restore env to avoid side effects across tests
    process.env.FEATURE_GAMIFICATION = originalEnv.FEATURE_GAMIFICATION;
    process.env.REACT_APP_FEATURE_GAMIFICATION = originalEnv.REACT_APP_FEATURE_GAMIFICATION;
    process.env.FEATURE_BEHAVIORAL_PROMOS = originalEnv.FEATURE_BEHAVIORAL_PROMOS;
    process.env.REACT_APP_FEATURE_BEHAVIORAL_PROMOS = originalEnv.REACT_APP_FEATURE_BEHAVIORAL_PROMOS;
  });

  test('defaults to conservative false when envs not set', async () => {
    delete process.env.FEATURE_GAMIFICATION;
    delete process.env.REACT_APP_FEATURE_GAMIFICATION;
    delete process.env.FEATURE_BEHAVIORAL_PROMOS;
    delete process.env.REACT_APP_FEATURE_BEHAVIORAL_PROMOS;

    const res = await request(app).get('/api/feature-flags');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('flags');
    expect(res.body.flags).toEqual({ gamification: false, behavioralPromos: false });
  });

  test('honors truthy values from either backend or frontend env names', async () => {
    process.env.FEATURE_GAMIFICATION = 'true';
    // Ensure precedence and truthy parsing no matter which var is read
    process.env.FEATURE_BEHAVIORAL_PROMOS = 'true';
    process.env.REACT_APP_FEATURE_BEHAVIORAL_PROMOS = '1';

    const res = await request(app).get('/api/feature-flags');
    expect(res.status).toBe(200);
    expect(res.body.flags.gamification).toBe(true);
    expect(res.body.flags.behavioralPromos).toBe(true);
  });
});
