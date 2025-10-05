const express = require('express');
const request = require('supertest');

// Mock auth to always allow and inject a default user
jest.mock('../../middleware/authMiddleware', () => ({
  protect: (req, _res, next) => {
    req.user = req.user || { _id: 'u1', role: 'admin', country: 'ET' };
    next();
  },
  authorize: () => (req, _res, next) => next(),
}));

// Stub Support model behavior per test via mutable impl
let mockSupportImpl = {};
jest.mock('../../models/Support', () => {
  return function Support(doc) {
    return {
      ...doc,
      save: mockSupportImpl.save || (async () => {}),
      _id: doc && doc._id || 's1',
    };
  };
});
const Support = require('../../models/Support');
const mongoose = require('mongoose');

// Attach statics after require to allow mutation in tests
Support.find = (...args) => {
  const makeChain = (arr) => ({
    populate: () => ({ sort: async () => arr }),
    sort: async () => arr,
  });
  if (mockSupportImpl.find) {
    const result = mockSupportImpl.find(...args);
    if (Array.isArray(result)) return makeChain(result);
    if (result && typeof result.sort === 'function') return result;
    return makeChain([]);
  }
  // Default chain mimicking .populate().sort() returning empty array
  return makeChain([]);
};
Support.findById = async (id) => { if (mockSupportImpl.findById) return mockSupportImpl.findById(id); return null; };

const router = require('../../routes/supportRoutes');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = req.user || { _id: 'u1', role: 'admin', country: 'ET' }; next(); });
  app.use('/api/support', router);
  return app;
}

describe('supportRoutes branches', () => {
  let app;
  beforeEach(() => {
    mockSupportImpl = {};
    app = makeApp();
    // Ensure ObjectId validity behaves deterministically in this unit test
    if (jest.isMockFunction(mongoose.Types.ObjectId.isValid)) {
      mongoose.Types.ObjectId.isValid.mockRestore();
    }
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockImplementation((id) => /^[0-9a-fA-F]{24}$/.test(String(id || '')));
  });

  afterEach(() => {
    if (jest.isMockFunction(mongoose.Types.ObjectId.isValid)) {
      mongoose.Types.ObjectId.isValid.mockRestore();
    }
  });

  test('POST / - missing message -> 400', async () => {
    const res = await request(app)
      .post('/api/support')
      .send({ subject: 'hi' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/message is required/i);
  });

  test('POST / - success 201 returns ticket including subject', async () => {
    mockSupportImpl.save = async () => {};
    const res = await request(app)
      .post('/api/support')
      .send({ subject: 'help', message: 'please assist', category: 'orders' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ subject: 'help', message: 'please assist' });
  });

  test('GET /user - no tickets -> 404', async () => {
    mockSupportImpl.find = async () => [];
    const res = await request(app).get('/api/support/user');
    expect(res.statusCode).toBe(404);
  });

  test('GET / - admin list returns 200 with array', async () => {
    mockSupportImpl.find = () => ([{ _id: 's1', message: 'm1' }, { _id: 's2', message: 'm2' }]);
    const res = await request(app).get('/api/support');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  test('PUT /:id - invalid id -> 400', async () => {
    const res = await request(app).put('/api/support/xyz').send({ status: 'resolved' });
    expect(res.statusCode).toBe(400);
  });

  test('PUT /:id - not found -> 404 (valid ObjectId)', async () => {
    const validMissingId = '507f1f77bcf86cd799439011'; // valid 24-hex id
    mockSupportImpl.findById = async () => null;
    const res = await request(app).put(`/api/support/${validMissingId}`).send({ status: 'resolved' });
    expect(res.statusCode).toBe(404);
  });

  test('PUT /:id - error handling -> 500 (valid ObjectId)', async () => {
    const validId = '5f1d7f1e5c8b4a2a1b3c4d5e';
    mockSupportImpl.findById = async () => { throw new Error('db down'); };
    const res = await request(app).put(`/api/support/${validId}`).send({ status: 'resolved' });
    expect(res.statusCode).toBe(500);
  });
});
