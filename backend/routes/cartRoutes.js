const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const { optionalAuth, protect } = require('../middleware/authMiddleware');

// GET /api/cart?anonymousId=...
router.get('/', optionalAuth, async (req, res) => {
  try {
    const anonymousId = req.query.anonymousId;
    const query = req.user?._id ? { user: req.user._id } : { anonymousId };
    if (!query.user && !query.anonymousId) {
      return res.json({ items: [] });
    }
    const cart = await Cart.findOne(query).populate('items.product', 'name price images');
    res.json({ items: cart?.items || [] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
});

// PUT /api/cart  { items: [{product, quantity}], anonymousId }
router.put('/', optionalAuth, async (req, res) => {
  try {
    const { items, anonymousId } = req.body || {};
    if (!Array.isArray(items)) return res.status(400).json({ message: 'items must be an array' });
    const query = req.user?._id ? { user: req.user._id } : { anonymousId };
    if (!query.user && !query.anonymousId) {
      return res.status(400).json({ message: 'anonymousId is required when not authenticated' });
    }
    const sanitized = items.filter(i => i && i.product && i.quantity > 0);
    const cart = await Cart.findOneAndUpdate(
      query,
      { $set: { items: sanitized } },
      { upsert: true, new: true }
    );
    res.json({ items: cart.items });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save cart' });
  }
});

// POST /api/cart/merge { anonymousId }
router.post('/merge', protect, async (req, res) => {
  try {
    const { anonymousId } = req.body || {};
    if (!anonymousId) return res.status(400).json({ message: 'anonymousId is required' });
    const [anonCart, userCart] = await Promise.all([
      Cart.findOne({ anonymousId }),
      Cart.findOne({ user: req.user._id })
    ]);
    if (!anonCart && !userCart) return res.json({ items: [] });
    const merged = new Map();
    const addItems = (arr=[]) => arr.forEach(i => {
      const key = String(i.product);
      merged.set(key, (merged.get(key) || 0) + Number(i.quantity || 1));
    });
    addItems(userCart?.items);
    addItems(anonCart?.items);
    const items = Array.from(merged.entries()).map(([product, quantity]) => ({ product, quantity }));
    const saved = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items } },
      { upsert: true, new: true }
    );
    if (anonCart) await Cart.deleteOne({ _id: anonCart._id });
    res.json({ items: saved.items });
  } catch (err) {
    res.status(500).json({ message: 'Failed to merge cart' });
  }
});

module.exports = router;
