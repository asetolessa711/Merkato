const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { optionalAuth } = require('../middleware/authMiddleware');

// GET /api/products/bundles?limit=3
router.get('/bundles', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 3), 10);
    // Simple first pass: return a few products as bundle suggestions
    const products = await Product.find({}).select('name price images').limit(limit);
    const bundles = products.map(p => ({ items: [p], savingsPct: 10 }));
    res.json({ bundles });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load bundles' });
  }
});

module.exports = router;

