const express = require('express');
const Cart = require('../models/Cart');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/cart?anonymousId=...
router.get('/', optionalAuth, async (req, res) => {
  try {
    const query = req.user ? { user: req.user._id } : { anonymousId: req.query.anonymousId || '' };
    const cart = await Cart.findOne(query).populate('items.product', 'name price images');
    return res.json({ items: cart?.items || [] });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to fetch cart' });
  }
});

// PUT /api/cart  { items: [{product, quantity}], anonymousId }
router.put('/', optionalAuth, async (req, res) => {
  try {
    const { items = [], anonymousId = '' } = req.body || {};
    const query = req.user ? { user: req.user._id } : { anonymousId };
    const update = { $set: { items } };
    const opts = { new: true, upsert: true, setDefaultsOnInsert: true };
    const cart = await Cart.findOneAndUpdate(query, update, opts).populate('items.product', 'name price images');
    return res.json({ items: cart.items });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to save cart' });
  }
});

// POST /api/cart/merge { anonymousId }
router.post('/merge', protect, async (req, res) => {
  try {
    const { anonymousId = '' } = req.body || {};
    const [anonCart, userCart] = await Promise.all([
      Cart.findOne({ anonymousId }),
      Cart.findOne({ user: req.user._id })
    ]);
    if (!anonCart && !userCart) return res.json({ items: [] });

    // Merge items (sum quantities by product)
    const map = new Map();
    const addItems = (items = []) => {
      for (const it of items) {
        const key = String(it.product);
        const existing = map.get(key) || { product: it.product, quantity: 0 };
        existing.quantity += Math.max(1, Number(it.quantity) || 1);
        map.set(key, existing);
      }
    };
    addItems(userCart?.items);
    addItems(anonCart?.items);

    const merged = Array.from(map.values());
    const saved = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: merged }, $unset: { anonymousId: '' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('items.product', 'name price images');

    if (anonCart) await Cart.deleteOne({ _id: anonCart._id });

    return res.json({ items: saved.items });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to merge cart' });
  }
});

module.exports = router;
