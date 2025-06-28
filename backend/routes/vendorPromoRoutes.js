// routes/vendorPromoRoutes.js

const express = require('express');
const router = express.Router();
const PromoCode = require('../models/PromoCode');
const PromoCampaign = require('../models/PromoCampaign');
const { protect, authorize } = require('../middleware/authMiddleware');

// ✅ GET: All promo codes created by the logged-in vendor
router.get('/', protect, authorize('vendor'), async (req, res) => {
  try {
    const promos = await PromoCode.find({ createdBy: req.user._id }).sort('-createdAt');
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch promo codes', error: err.message });
  }
});

// ✅ POST: Create a new promo code
router.post('/', protect, authorize('vendor'), async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minOrderValue,
      usageLimit,
      expiresAt,
      appliesToFirstTimeUsersOnly
    } = req.body;

    const newPromo = new PromoCode({
      code,
      type,
      value,
      minOrderValue,
      usageLimit,
      expiresAt,
      appliesToFirstTimeUsersOnly,
      createdBy: req.user._id
    });

    await newPromo.save();
    res.status(201).json({ message: 'Promo code created', promo: newPromo });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create promo code', error: err.message });
  }
});

// ✅ DELETE: Remove a promo code
router.delete('/:id', protect, authorize('vendor'), async (req, res) => {
  try {
    const promo = await PromoCode.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!promo) return res.status(404).json({ message: 'Promo not found or unauthorized' });

    await promo.remove();
    res.json({ message: 'Promo code deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete promo code', error: err.message });
  }
});

module.exports = router;
