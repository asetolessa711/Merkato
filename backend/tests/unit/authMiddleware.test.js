// Unit tests for auth middleware behaviors with mocked jwt and User.
// Covers: protect, authorize, optionalAuth, isCountryAdmin, isGlobalAdmin, filterOrdersByCountry.

jest.mock('jsonwebtoken');
const jwt = require('jsonwebtoken');

// Mock User model
jest.mock('../../models/User', () => ({
  findById: jest.fn(),
}));
const User = require('../../models/User');

const {
  protect,
  authorize,
  optionalAuth,
  isCountryAdmin,
  isGlobalAdmin,
  filterOrdersByCountry,
} = require('../../middleware/authMiddleware');

// Helper to create mock req/res/next
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.headersSent = false;
  return res;
};

const mockNext = () => jest.fn();

describe('authMiddleware', () => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    process.env = { ...OLD_ENV, NODE_ENV: 'test', JWT_SECRET: 'secret' };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('protect', () => {
    test('responds 401 when no token provided', async () => {
      const req = { headers: {} };
      const res = mockRes();
      const next = mockNext();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/no token/i) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('responds 401 when token verification fails', async () => {
      const req = { headers: { authorization: 'Bearer badtoken' } };
      const res = mockRes();
      const next = mockNext();
      jwt.verify.mockImplementation(() => { throw new Error('bad token'); });

      await protect(req, res, next);

      expect(jwt.verify).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/token failed/i) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('responds 401 when user not found', async () => {
      const req = { headers: { authorization: 'Bearer good' } };
      const res = mockRes();
      const next = mockNext();
      jwt.verify.mockReturnValue({ _id: 'user123' });
  User.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue(null) });

      await protect(req, res, next);

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/user not found/i) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('calls next and sets req.user when token valid and user exists', async () => {
      const req = { headers: { authorization: 'Bearer good' } };
      const res = mockRes();
      const next = mockNext();
      const user = { _id: 'user123', email: 'u@test.com', roles: ['customer'] };
      jwt.verify.mockReturnValue({ _id: 'user123' });
  User.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue(user) });

      await protect(req, res, next);

      expect(req.user).toEqual(user);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    test('denies when user lacks required role', () => {
      const req = { user: { roles: ['customer'] } };
      const res = mockRes();
      const next = mockNext();

      authorize('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.any(Object));
      expect(next).not.toHaveBeenCalled();
    });

    test('allows when user has any allowed role', () => {
      const req = { user: { roles: ['vendor', 'customer'] } };
      const res = mockRes();
      const next = mockNext();

      authorize('admin', 'vendor')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    test('skips when no bearer token', async () => {
      const req = { headers: {} };
      const res = mockRes();
      const next = mockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    test('ignores invalid token and continues', async () => {
      const req = { headers: { authorization: 'Bearer bad' } };
      const res = mockRes();
      const next = mockNext();
      jwt.verify.mockImplementation(() => { throw new Error('bad'); });

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    test('sets req.user when token valid', async () => {
      const req = { headers: { authorization: 'Bearer good' } };
      const res = mockRes();
      const next = mockNext();
      const user = { _id: 'u1', roles: ['customer'] };
      jwt.verify.mockReturnValue({ _id: 'u1' });
  User.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue(user) });

      await optionalAuth(req, res, next);

      expect(req.user).toEqual(user);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('role helpers', () => {
    test('isCountryAdmin allows only country_admin', () => {
      const res1 = mockRes();
      const next1 = mockNext();
      isCountryAdmin({ user: { roles: ['country_admin'] } }, res1, next1);
      expect(next1).toHaveBeenCalled();

      const res2 = mockRes();
      const next2 = mockNext();
      isCountryAdmin({ user: { roles: ['admin'] } }, res2, next2);
      expect(res2.status).toHaveBeenCalledWith(403);
    });

    test('isGlobalAdmin allows only global_admin', () => {
      const res1 = mockRes();
      const next1 = mockNext();
      isGlobalAdmin({ user: { roles: ['global_admin'] } }, res1, next1);
      expect(next1).toHaveBeenCalled();

      const res2 = mockRes();
      const next2 = mockNext();
      isGlobalAdmin({ user: { roles: ['admin'] } }, res2, next2);
      expect(res2.status).toHaveBeenCalledWith(403);
    });

    test('filterOrdersByCountry sets filter for country_admin and allows admin/global', () => {
      const next1 = mockNext();
      const req1 = { user: { roles: ['admin'] } };
      filterOrdersByCountry(req1, mockRes(), next1);
      expect(req1.countryFilter).toEqual({});
      expect(next1).toHaveBeenCalled();

      const next2 = mockNext();
      const req2 = { user: { roles: ['country_admin'], country: 'ET' } };
      filterOrdersByCountry(req2, mockRes(), next2);
      expect(req2.countryFilter).toEqual({
        $or: [
          { 'shippingAddress.country': 'ET' },
          { 'buyer.country': 'ET' }
        ]
      });
      expect(next2).toHaveBeenCalled();

      const res3 = mockRes();
      const next3 = mockNext();
      const req3 = { user: { roles: ['country_admin'] } }; // missing country
      filterOrdersByCountry(req3, res3, next3);
      expect(res3.status).toHaveBeenCalledWith(403);

      const res4 = mockRes();
      const next4 = mockNext();
      const req4 = { user: { roles: ['vendor'] } };
      filterOrdersByCountry(req4, res4, next4);
      expect(res4.status).toHaveBeenCalledWith(403);
    });
  });
});
