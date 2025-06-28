const express = require('express');
const router = express.Router();
const Favorite = require('../models/Favorite');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get user's favorites
router.get('/', protect, authorize('customer', 'vendor', 'admin'), async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id }).populate('product');
    res.json(favorites.map(fav => fav.product));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch favorites' });
  }
});

// Save a product
router.post('/:id', protect, authorize('customer', 'vendor', 'admin'), async (req, res) => {
  try {
    const exists = await Favorite.findOne({ user: req.user._id, product: req.params.id });
    if (exists) return res.status(200).json({ message: 'Already favorited' });

    const favorite = new Favorite({ user: req.user._id, product: req.params.id });
    await favorite.save();
    res.status(201).json({ message: 'Product saved' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save product' });
  }
});

// Remove favorite
router.delete('/:id', protect, authorize('customer', 'vendor', 'admin'), async (req, res) => {
  try {
    await Favorite.findOneAndDelete({ user: req.user._id, product: req.params.id });
    res.json({ message: 'Product unsaved' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove favorite' });
  }
});

module.exports = router;