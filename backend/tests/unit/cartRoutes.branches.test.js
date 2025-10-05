const express = require('express');
const request = require('supertest');

// Mock auth: optionalAuth sets req.user when header present; protect requires user
jest.mock('../../middleware/authMiddleware', () => ({
  optionalAuth: (req, _res, next) => {
    const auth = req.headers['authorization'];
    if (auth) req.user = { _id: 'u1' };
    next();
  },
  protect: (req, _res, next) => { req.user = req.user || { _id: 'u1' }; next(); },
}));

let mockCartImpl = {};
jest.mock('../../models/Cart', () => ({
  findOne: (...args) => {
    if (mockCartImpl.findOne) {
      const doc = mockCartImpl.findOne(...args);
      if (doc && typeof doc === 'object') {
        return { ...doc, populate: () => Promise.resolve(doc) };
      }
    }
    const doc = { items: [] };
    return { ...doc, populate: () => Promise.resolve(doc) };
  },
  findOneAndUpdate: (...args) => {
    if (mockCartImpl.findOneAndUpdate) {
      const doc = mockCartImpl.findOneAndUpdate(...args);
      if (doc && typeof doc === 'object') {
        return { ...doc, populate: () => Promise.resolve(doc) };
      }
    }
    const doc = { items: [] };
    return { ...doc, populate: () => Promise.resolve(doc) };
  },
  deleteOne: (...args) => mockCartImpl.deleteOne ? mockCartImpl.deleteOne(...args) : ({}),
}));
const Cart = require('../../models/Cart');

const router = require('../../routes/cartRoutes');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/cart', router);
  return app;
}

describe('cartRoutes branches', () => {
  let app;
  beforeEach(() => { mockCartImpl = {}; app = makeApp(); });

  test('GET / anonymous uses query.anonymousId', async () => {
    mockCartImpl.findOne = async (q) => ({ items: [{ product: 'p1', quantity: 2 }] });
    const res = await request(app).get('/api/cart?anonymousId=anon-1');
    expect(res.statusCode).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  test('GET / with user uses user id', async () => {
    mockCartImpl.findOne = async (q) => ({ items: [{ product: 'p2', quantity: 3 }] });
    const res = await request(app).get('/api/cart').set('Authorization', 'Bearer t');
    expect(res.statusCode).toBe(200);
    expect(res.body.items[0].product).toBe('p2');
  });

  test('PUT / upsert returns saved items', async () => {
    mockCartImpl.findOneAndUpdate = async (_q, _u, _o) => ({ items: [{ product: 'p1', quantity: 1 }] });
    const res = await request(app).put('/api/cart').send({ items: [{ product: 'p1', quantity: 1 }], anonymousId: 'anon-1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  test('POST /merge none present -> []', async () => {
    mockCartImpl.findOne = async () => null;
    const res = await request(makeApp()).post('/api/cart/merge').set('Authorization', 'b t').send({ anonymousId: 'a1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  test('POST /merge merges quantities and deletes anon', async () => {
    mockCartImpl.findOne = async (q) => {
      if (q.anonymousId) return { _id: 'cAnon', items: [{ product: 'p1', quantity: 1 }] };
      if (q.user) return { _id: 'cUser', items: [{ product: 'p1', quantity: 2 }, { product: 'p2', quantity: 1 }] };
      return null;
    };
  const deleteSpy = jest.fn(async () => ({}));
  mockCartImpl.deleteOne = async ({ _id }) => { deleteSpy(_id); return {}; };
    mockCartImpl.findOneAndUpdate = async () => ({ items: [{ product: 'p1', quantity: 3 }, { product: 'p2', quantity: 1 }] });

    const res = await request(app).post('/api/cart/merge').set('Authorization', 'Bearer t').send({ anonymousId: 'a1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ product: 'p1', quantity: 3 }),
      expect.objectContaining({ product: 'p2', quantity: 1 }),
    ]));
    expect(deleteSpy).toHaveBeenCalled();
  });
});
