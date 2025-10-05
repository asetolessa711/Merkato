const express = require('express');
const request = require('supertest');

describe('railsRoutes metrics/flush branch coverage (isolated)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('handles suppression subtypes, atc rev, item events, and duplicate-key session ignore', async () => {
    let RailSessionSeenDaily;
    let RailMetricsDaily;
    let sessionSeenCall = 0;

    let app;
    jest.isolateModules(() => {
      // Bypass auth for this isolated module graph
      jest.doMock('../../middleware/authMiddleware', () => ({
        protect: (_req, _res, next) => next(),
        authorize: () => (_req, _res, next) => next(),
      }));
      // Avoid real file I/O
      jest.doMock('fs/promises', () => ({
        mkdir: jest.fn(async () => {}),
        appendFile: jest.fn(async () => {}),
        readFile: jest.fn(async () => ''),
      }));
      // Mock models used by metrics flush only within this module scope
      jest.doMock('../../models/RailSessionSeenDaily', () => ({
        findOneAndUpdate: jest.fn(async () => {
          sessionSeenCall += 1;
          if (sessionSeenCall === 1) {
            const err = new Error('dup');
            err.code = 11000;
            throw err;
          }
          return null;
        }),
      }));
      jest.doMock('../../models/RailMetricsDaily', () => ({
        findOneAndUpdate: jest.fn(async () => ({})),
      }));

      // Require after setting mocks
      RailSessionSeenDaily = require('../../models/RailSessionSeenDaily');
      RailMetricsDaily = require('../../models/RailMetricsDaily');
      const router = require('../../routes/railsRoutes');
      const expressApp = express();
      expressApp.use(express.json());
      expressApp.use('/api', router);
      app = expressApp;
    });

    const events = [
      { railId: 'r_dupKey', type: 'imp', count: 1 },
      { railId: 'r_newSess', type: 'imp', count: 1 },
      { railId: 'r_newSess', type: 'suppression', subtype: 'capacityTrim', count: 2 },
      { railId: 'r_newSess', type: 'suppression', subtype: 'capacityRail', count: 1 },
      { railId: 'r_newSess', type: 'suppression', subtype: 'siteSponsored', count: 3 },
      { railId: 'r_newSess', type: 'suppression', count: 4 },
      { railId: 'r_newSess', type: 'item', subtype: 'clk', sku: 'SKU-1', count: 1 },
      { railId: 'r_newSess', type: 'item', subtype: 'atc', sku: 'SKU-1', count: 1 },
      { railId: 'r_newSess', type: 'atc', count: 1, rev: 5 },
      { railId: 'r_newSess', type: 'clk', count: 1 },
    ];

    const res = await request(app)
      .post('/api/rails/metrics/flush')
      .set('Cookie', 'railSessId=ses_X')
      .send({ events });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ ok: true, processed: events.length }));
    expect(RailMetricsDaily.findOneAndUpdate).toHaveBeenCalled();
    expect(RailSessionSeenDaily.findOneAndUpdate).toHaveBeenCalled();
  });
});
