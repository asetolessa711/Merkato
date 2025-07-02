const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ✅ Middleware: Protect route
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        console.error('❌ protect: user not found for decoded id');
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = user;
      return next();
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // Null check for token outside the if block
  if (!token) {
    console.error('❌ protect: no token provided');
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// ✅ Middleware: Authorize one or more allowed roles
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [req.user?.role];
    if (!userRoles || !allowedRoles.some(role => userRoles.includes(role))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

// ✅ Middleware: Only Country Admin
const isCountryAdmin = (req, res, next) => {
  const roles = req.user?.roles || [req.user?.role];
  if (roles.includes('country_admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Country Admins only' });
};

// ✅ Middleware: Only Global Admin
const isGlobalAdmin = (req, res, next) => {
  const roles = req.user?.roles || [req.user?.role];
  if (roles.includes('global_admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Global Admins only' });
};

// ✅ Smart middleware to restrict order visibility by country admin
const filterOrdersByCountry = (req, res, next) => {
  const roles = req.user?.roles || [req.user?.role];

  if (roles.includes('admin') || roles.includes('global_admin')) {
    req.countryFilter = {}; // full access
    return next();
  }

  if (roles.includes('country_admin')) {
    const country = req.user.country;
    if (!country) {
      return res.status(403).json({ message: 'No country assigned to this admin' });
    }

    req.countryFilter = {
      $or: [
        { 'shippingAddress.country': country },
        { 'buyer.country': country }
      ]
    };
    return next();
  }

  return res.status(403).json({ message: 'Access denied: Unauthorized role' });
};

module.exports = {
  protect,
  authorize,
  isCountryAdmin,
  isGlobalAdmin,
  filterOrdersByCountry,
  ensureAuth: protect // alias for naming consistency
};