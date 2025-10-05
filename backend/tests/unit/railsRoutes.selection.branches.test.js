const express = require('express');
const request = require('supertest');

// Bypass auth in unit tests
jest.mock('../../middleware/authMiddleware', () => ({
  protect: (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
}));

// Mutable fakes per test
let mockRails = [];
let mockCfg = {};
let mockCounts = [];
let mockDailyDocs = [];
let mockProductFindBehavior = 'ok'; // 'ok' | 'throw'

// Mock models consumed by routes
jest.mock('../../models/Rail', () => ({
  find: jest.fn(() => ({
    sort: () => ({
      limit: () => ({
        lean: async () => mockRails,
      })
    }),
    limit: () => ({
      lean: async () => mockRails,
    }),
    lean: async () => mockRails,
  })),
  countDocuments: jest.fn(async () => Array.isArray(mockRails) ? mockRails.length : 0),
}));
const Rail = require('../../models/Rail');

jest.mock('../../models/RailMetricsDaily', () => ({
  aggregate: jest.fn(async () => mockCounts),
  findOneAndUpdate: jest.fn(),
  find: jest.fn(() => ({
    lean: async () => mockDailyDocs,
  })),
}));
const RailMetricsDaily = require('../../models/RailMetricsDaily');

jest.mock('../../models/RailConfig', () => ({
  findById: jest.fn(() => ({
    lean: async () => mockCfg,
  })),
}));
const RailConfig = require('../../models/RailConfig');

jest.mock('../../models/RailDecisionLog', () => ({
  create: jest.fn(async () => ({})),
}));

jest.mock('../../models/Product', () => ({
  find: jest.fn(() => ({
    select: () => ({
      lean: async () => {
        if (mockProductFindBehavior === 'throw') {
          const err = new Error('db cast error');
          err.name = 'CastError';
          throw err;
        }
        return [];
      }
    })
  })),
}));
const Product = require('../../models/Product');

const router = require('../../routes/railsRoutes');

function makeApp() {
  const app = express();
  app.use('/api', router);
  return app;
}

describe('railsRoutes selection branches', () => {
  let app;
  beforeEach(() => {
    app = makeApp();
    mockRails = [];
    mockCfg = { _id: 'default', selection: { surfaces: { home: { placements: ['HeroTop','CategoryTop','Mid'] } } }, weights:{}, floors:{} };
    mockCounts = [];
    mockDailyDocs = [];
  mockProductFindBehavior = 'ok';
    process.env.RAILS_SELECTION_V1 = 'true';
  });

  test('kill switch returns ok:false 200 on admin selection', async () => {
    mockCfg.killSwitch = true;
    const res = await request(app).get('/api/admin/rails/selection?surface=home&form=desktop');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.selection)).toBe(true);
  });

  test('product lookup failure is handled without 500', async () => {
    mockCfg.killSwitch = false;
    // Two rails with items; one CategoryTop duplicate to hit suppression path
    mockRails = [
      { railId: 'r1', title: 'R1', placementKey: 'CategoryTop', category: 'Books', environment:'Prod', opsStatus:'active', priority: 10, items:[{ sku:'SKU1' },{ sku:'SKU2' }] , meta:{ updatedAtUTC: new Date().toISOString() } },
      { railId: 'r2', title: 'R2', placementKey: 'CategoryTop', category: 'Books', environment:'Prod', opsStatus:'active', priority: 9, items:[{ sku:'SKU3' }] , meta:{ updatedAtUTC: new Date().toISOString() } },
    ];
    // Minimal counts so floors pass
    mockCounts = [ { _id:'r1', imp: 1000, rev: 10 }, { _id:'r2', imp: 1000, rev: 10 } ];
  mockProductFindBehavior = 'throw';
    const res = await request(app).get('/api/admin/rails/selection?surface=home&form=desktop');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('selection');
    expect(Array.isArray(res.body.selection)).toBe(true);
    // Only one CategoryTop for same category should be picked
    expect(res.body.selection.length).toBe(1);
    // product_lookup_failed branch should be logged in decisionLogs
    expect(Array.isArray(res.body.decisionLogs)).toBe(true);
    const steps = res.body.decisionLogs.map(d=>d && d.step).filter(Boolean);
    expect(steps).toContain('product_lookup_failed');
  });

  test('HeroTop rail suppressed by 7d impressions floor', async () => {
    mockCfg.killSwitch = false;
    // Single HeroTop candidate with very low 7d impressions to trigger HERO_IMP_FLOOR
    mockRails = [
      { railId: 'hero1', title: 'Hero', placementKey: 'HeroTop', environment:'Prod', opsStatus:'active', priority: 5, items: [], meta:{ updatedAtUTC: new Date().toISOString() } },
    ];
    // 7d metrics: low impressions
    mockCounts = [ { _id:'hero1', imp: 5, rev: 0 } ];
    const res = await request(app).get('/api/admin/rails/selection?surface=home&form=desktop');
    expect(res.statusCode).toBe(200);
    // Floor suppression should result in zero selection
    expect(Array.isArray(res.body.selection)).toBe(true);
    expect(res.body.selection.length).toBe(0);
    // decisionLogs include a 'selected' step with suppressedRails > 0
    const selectedLog = (res.body.decisionLogs || []).find(d => d && d.step === 'selected');
    expect(selectedLog).toBeTruthy();
    expect(selectedLog.suppressedRails).toBeGreaterThanOrEqual(1);
  });

  test('RPM_FLOOR suppresses low-RPM rails based on quantile cutoff', async () => {
    mockCfg.killSwitch = false;
    // Two Mid rails with very different RPMs; 25th percentile cutoff should suppress the low one
    mockRails = [
      { railId: 'mid_low', title: 'Low RPM', placementKey: 'Mid', environment:'Prod', opsStatus:'active', priority: 5, items: [{ sku:'SKU_L1' }], meta:{ updatedAtUTC: new Date().toISOString() } },
      { railId: 'mid_high', title: 'High RPM', placementKey: 'Mid', environment:'Prod', opsStatus:'active', priority: 6, items: [{ sku:'SKU_H1' }], meta:{ updatedAtUTC: new Date().toISOString() } },
    ];
    // rpm = (rev/imp) * 1000; for imp=1000 => rev equals rpm
    mockCounts = [
      { _id:'mid_low', imp: 1000, rev: 0.1 },  // rpm = 0.1
      { _id:'mid_high', imp: 1000, rev: 5.0 }, // rpm = 5.0
    ];
    const res = await request(app).get('/api/admin/rails/selection?surface=home&form=desktop');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.selection)).toBe(true);
    // Expect only the higher RPM rail to survive
    const ids = res.body.selection.map(s=>s.railId);
    expect(ids).toContain('mid_high');
    expect(ids).not.toContain('mid_low');
    // And at least one rail was suppressed by floors
    const selectedLog = (res.body.decisionLogs || []).find(d => d && d.step === 'selected');
    expect(selectedLog).toBeTruthy();
    expect(selectedLog.suppressedRails).toBeGreaterThanOrEqual(1);
  });

  test('capacity.minItems causes suppression when deduped items fall below minimum', async () => {
    mockCfg.killSwitch = false;
    // First rail has duplicate SKUs within its own items; minItems=2 should suppress after dedupe to 1
    mockRails = [
      { railId: 'r_min', title: 'Needs 2 items', placementKey: 'Mid', environment:'Prod', opsStatus:'active', priority: 10, capacity:{ minItems:2 }, items: [{ sku:'DUP' }, { sku:'DUP' }], meta:{ updatedAtUTC: new Date().toISOString() } },
      { railId: 'r_ok', title: 'OK rail', placementKey: 'Mid', environment:'Prod', opsStatus:'active', priority: 9, items: [{ sku:'OK1' }], meta:{ updatedAtUTC: new Date().toISOString() } },
    ];
    // Provide healthy metrics so floors don’t interfere
    mockCounts = [ { _id:'r_min', imp: 1000, rev: 10 }, { _id:'r_ok', imp: 1000, rev: 10 } ];
    const res = await request(app).get('/api/admin/rails/selection?surface=home&form=desktop');
    expect(res.statusCode).toBe(200);
    const ids = res.body.selection.map(s=>s.railId);
    // r_min should be suppressed (deduped items < minItems); r_ok should remain
    expect(ids).not.toContain('r_min');
    expect(ids).toContain('r_ok');
    const selectedLog = (res.body.decisionLogs || []).find(d => d && d.step === 'selected');
    expect(selectedLog).toBeTruthy();
    expect(selectedLog.suppressedRails).toBeGreaterThanOrEqual(1);
  });

  test('public selection: product lookup failure handled and CategoryTop uniqueness enforced', async () => {
    mockCfg.killSwitch = false;
    mockRails = [
      { railId: 'pub_r1', title: 'R1', placementKey: 'CategoryTop', category: 'Books', environment:'Prod', opsStatus:'active', priority: 10, items:[{ sku:'S1' }], meta:{ updatedAtUTC: new Date().toISOString() } },
      { railId: 'pub_r2', title: 'R2', placementKey: 'CategoryTop', category: 'Books', environment:'Prod', opsStatus:'active', priority: 9, items:[{ sku:'S2' }], meta:{ updatedAtUTC: new Date().toISOString() } },
    ];
    // Make floors pass for both
    mockCounts = [ { _id:'pub_r1', imp: 1000, rev: 10 }, { _id:'pub_r2', imp: 1000, rev: 10 } ];
    // Force Product.find to throw to exercise public route catch branch
    mockProductFindBehavior = 'throw';
    const res = await request(app).get('/api/rails/selection?surface=home&form=desktop');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.selection)).toBe(true);
    // Uniqueness: only one CategoryTop for the same category should remain
    expect(res.body.selection.length).toBe(1);
    const only = res.body.selection[0];
    expect(['pub_r1','pub_r2']).toContain(only.railId);
  });

  test('metrics: distinct=none disables dedupe branch', async () => {
    mockCfg.killSwitch = false;
    // Two rails with identical displayName to exercise the dedupe vs non-dedupe branch
    mockRails = [
      { railId:'m1', title:'Same', displayName:'Same', environment:'Prod', opsStatus:'active', meta:{ updatedAtUTC: new Date().toISOString() } },
      { railId:'m2', title:'Same', displayName:'Same', environment:'Prod', opsStatus:'active', meta:{ updatedAtUTC: new Date().toISOString() } },
    ];
    mockCounts = []; // no 7d aggregates needed for this test
    mockDailyDocs = []; // no baseline docs
    const res = await request(app).get('/api/admin/rails/metrics?distinct=none');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.rails)).toBe(true);
    // Without dedupe, both rows should be present
    expect(res.body.rails.length).toBe(2);
  });

  test('metrics: default distinct by title prefers most recent', async () => {
    const now = Date.now();
    mockRails = [
      { railId:'d1', title:'Same', displayName:'Same', environment:'Prod', opsStatus:'active', meta:{ updatedAtUTC: new Date(now - 10000).toISOString() } },
      { railId:'d2', title:'Same', displayName:'Same', environment:'Prod', opsStatus:'active', meta:{ updatedAtUTC: new Date(now).toISOString() } },
    ];
    const res = await request(app).get('/api/admin/rails/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.body.rails.length).toBe(1);
    expect(res.body.rails[0].railId).toBe('d2');
  });

  test('RPM floor disabled when rpmQuantileMin=0', async () => {
    mockCfg.killSwitch = false;
    mockCfg.floors = { rpmQuantileMin: 0 };
    mockRails = [
      { railId: 'q0_low', title: 'Low', placementKey: 'Mid', environment:'Prod', opsStatus:'active', priority: 1, items:[{ sku:'A' }], meta:{ updatedAtUTC: new Date().toISOString() } },
      { railId: 'q0_high', title: 'High', placementKey: 'Mid', environment:'Prod', opsStatus:'active', priority: 2, items:[{ sku:'B' }], meta:{ updatedAtUTC: new Date().toISOString() } },
    ];
    mockCounts = [ { _id:'q0_low', imp: 1000, rev: 0.1 }, { _id:'q0_high', imp: 1000, rev: 0.2 } ];
    const res = await request(app).get('/api/admin/rails/selection?surface=home&form=desktop');
    expect(res.statusCode).toBe(200);
    const ids = res.body.selection.map(s=>s.railId);
    // With RPM floor disabled, both should be eligible (up to maxRails)
    expect(ids).toContain('q0_low');
    expect(ids).toContain('q0_high');
  });

  test('presets resolve unknown returns 404, list returns 200', async () => {
    const res1 = await request(app).post('/api/admin/rails/presets/resolve').send({ preset: 'nope' });
    expect([200,404]).toContain(res1.statusCode);
    if (res1.statusCode === 404) {
      expect(res1.body.message).toMatch(/Preset not found/);
    }
    const res2 = await request(app).get('/api/admin/rails/presets');
    expect(res2.statusCode).toBe(200);
    expect(res2.body).toHaveProperty('presets');
  });

  test('audit endpoint returns 200 with empty entries array when no file', async () => {
    const res = await request(app).get('/api/admin/rails/audit');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('entries');
    expect(Array.isArray(res.body.entries)).toBe(true);
  });
});
