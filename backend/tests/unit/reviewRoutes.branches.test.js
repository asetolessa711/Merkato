const express = require('express');
const request = require('supertest');

// Mock auth to inject a basic user; allow authorize to pass
jest.mock('../../middleware/authMiddleware', () => ({
  protect: (req, _res, next) => { req.user = req.user || { _id: 'u1', role: 'customer' }; next(); },
  authorize: () => (req, _res, next) => next(),
}));

// Mutable impl for Review model
let mockReviewImpl = {};
jest.mock('../../models/Review', () => {
  return function Review(doc) {
    return {
      ...doc,
      save: mockReviewImpl.save || (async () => {}),
      remove: mockReviewImpl.remove || (async () => {}),
      _id: doc && doc._id || 'r1',
      user: doc && doc.user || 'u1',
    };
  };
});
const Review = require('../../models/Review');
Review.find = async (...args) => mockReviewImpl.find ? mockReviewImpl.find(...args) : [];
Review.findOne = async (...args) => mockReviewImpl.findOne ? mockReviewImpl.findOne(...args) : null;
Review.findById = async (id) => mockReviewImpl.findById ? mockReviewImpl.findById(id) : null;

// Patch mongoose isValid to force invalid path on demand
jest.mock('mongoose', () => ({
  Types: { ObjectId: { isValid: (id) => id !== 'bad' } },
}));

const router = require('../../routes/reviewRoutes');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/reviews', router);
  return app;
}

describe('reviewRoutes branches', () => {
  let app;
  beforeEach(() => { mockReviewImpl = {}; app = makeApp(); });

  test('DELETE /:id invalid id -> 400', async () => {
    const res = await request(app).delete('/api/reviews/bad');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid review id/i);
  });

  test('DELETE /:id not found -> 404', async () => {
    mockReviewImpl.findById = async () => null;
    const res = await request(app).delete('/api/reviews/507f1f77bcf86cd799439011');
    expect(res.statusCode).toBe(404);
  });

  test('DELETE /:id unauthorized -> 403', async () => {
    mockReviewImpl.findById = async () => ({ _id: 'r1', user: 'someone-else', remove: async () => {} });
    const res = await request(app).delete('/api/reviews/507f1f77bcf86cd799439011');
    expect(res.statusCode).toBe(403);
  });

  test('DELETE /:id success for owner -> 200', async () => {
    mockReviewImpl.findById = async () => ({ _id: 'r2', user: 'u1', remove: async () => {} });
    const res = await request(app).delete('/api/reviews/507f1f77bcf86cd799439012');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
