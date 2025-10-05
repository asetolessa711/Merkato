const express = require('express');
const request = require('supertest');

// Bypass auth for admin alerts route
jest.mock('../../middleware/authMiddleware', () => ({
  protect: (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
}));

// Import models to spy/mock statics
const RailMetricsDaily = require('../../models/RailMetricsDaily');
const RailDecisionLog = require('../../models/RailDecisionLog');
const Rail = require('../../models/Rail');
jest.mock('../../models/RailConfig', () => ({
  findById: jest.fn(() => ({
    lean: async () => ({
      alerts: {
        selectionLatencyMs: 100,
        staleRollupDays: 2,
        anomalyCtrPct: 10,
        anomalyRpmPct: 10,
        freshnessDays: 14,
        freshnessCtrFloor: 0.01,
      },
    }),
  })),
}));

const router = require('../../routes/railsRoutes');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  return app;
}

describe('railsRoutes alerts endpoint', () => {
  let app;
  beforeEach(() => {
    app = makeApp();
    // Fresh spies per test
    jest.restoreAllMocks();
  });

  test('emits anomaly and freshness alerts with mocked metrics', async () => {
    // Make rollups fresh (avoid STALE_ROLLUPS)
    const todayStr = new Date().toISOString().slice(0, 10);
    jest.spyOn(RailMetricsDaily, 'findOne').mockReturnValue({
      sort: () => ({
        lean: async () => ({ date: todayStr })
      })
    });

    // Decision logs: one empty selection and one slow selection
    jest.spyOn(RailDecisionLog, 'find').mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => ([
            { ts: new Date(), selection: [], durationMs: 50 },
            { ts: new Date(), selection: [{ railId: 'x' }], durationMs: 999 }
          ])
        })
      })
    });

    // Rail list for freshness (stale rail)
    jest.spyOn(Rail, 'find').mockReturnValueOnce({
      select: () => ({
        lean: async () => ([
          { railId: 'r2', title: 'Stale Rail', meta: { updatedAtUTC: new Date(Date.now() - 20*86400000) }, environment: 'Prod', opsStatus: 'active' }
        ])
      })
    });

    // Aggregate calls (in order):
    // 1) capAgg for siteSponsored -> keep low to avoid CAP_SITE_HIGH
    // 2) anomaly last1d
    // 3) anomaly base7d
    // 4) freshness metrics for rails list
    jest.spyOn(RailMetricsDaily, 'aggregate')
      .mockResolvedValueOnce([{ _id: null, siteSupp: 0 }])
      .mockResolvedValueOnce([
        { _id: 'r1', imp: 10, clk: 3, rev: 0.03 }, // 1d CTR 30%, RPM 3
      ])
      .mockResolvedValueOnce([
        { _id: 'r1', imp: 100, clk: 10, rev: 0.1 }, // 7d CTR 10%, RPM 1 -> large swing
      ])
      .mockResolvedValueOnce([
        { _id: 'r2', imp: 100, clk: 0 }, // freshness: CTR 0 below floor
      ]);

    const res = await request(app)
      .get('/api/admin/rails/alerts')
      .set('Authorization', 'Bearer test');

    expect(res.statusCode).toBe(200);
    const types = (res.body.alerts || []).map(a => a.type);
    expect(types).toEqual(expect.arrayContaining(['EMPTY_SELECTION', 'SELECTION_SLOW', 'ANOMALY', 'FRESHNESS_SLA']));
    // Ensure CAP_SITE_HIGH and STALE_ROLLUPS are not triggered in this scenario
    expect(types).not.toContain('CAP_SITE_HIGH');
    expect(types).not.toContain('STALE_ROLLUPS');
  });
});
