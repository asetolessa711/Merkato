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
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// ✅ Middleware: Authorize one or more allowed roles
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user.roles || [req.user.role]; // fallback for old tokens
    if (!allowedRoles.some(role => userRoles.includes(role))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

// ✅ Middleware: Only Country Admin
const isCountryAdmin = (req, res, next) => {
  const roles = req.user.roles || [req.user.role];
  if (roles.includes('country_admin')) {
    return next();
  } else {
    return res.status(403).json({ message: 'Access denied: Country Admins only' });
  }
};

// ✅ Middleware: Only Global Admin
const isGlobalAdmin = (req, res, next) => {
  const roles = req.user.roles || [req.user.role];
  if (roles.includes('global_admin')) {
    return next();
  } else {
    return res.status(403).json({ message: 'Access denied: Global Admins only' });
  }
};

// ✅ Smart middleware to restrict order visibility by country admin
const filterOrdersByCountry = async (req, res, next) => {
  const roles = req.user.roles || [req.user.role];

  // If global or full admin, allow all orders
  if (roles.includes('admin') || roles.includes('global_admin')) {
    req.countryFilter = {}; // no filter
    return next();
  }

  if (roles.includes('country_admin')) {
    const country = req.user.country;
    if (!country) {
      return res.status(403).json({ message: 'No country assigned to admin' });
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
  ensureAuth: protect // ✅ alias for consistent usage
};
