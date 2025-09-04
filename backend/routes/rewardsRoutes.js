const express = require('express');
const router = express.Router();
const RewardPointLedger = require('../models/RewardPointLedger');
const { protect, authorize } = require('../middleware/authMiddleware');
const { FEATURE_GAMIFICATION } = require('../utils/flags');

// Middleware gate: short-circuit when feature is off
router.use((req, res, next) => {
  if (!FEATURE_GAMIFICATION) return res.status(404).json({ message: 'Not found' });
  next();
});

// Get current user's rewards summary
router.get('/me', protect, authorize('customer'), async (req, res) => {
  try {
    const [balance, recent] = await Promise.all([
      RewardPointLedger.getBalance(req.user._id),
      RewardPointLedger.find({ user: req.user._id }).sort('-createdAt').limit(50).lean(),
    ]);
    res.json({ success: true, balance, recent });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load rewards', error: err.message });
  }
});

// Admin adjustment endpoint (positive or negative)
router.post('/adjust', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId, points, reason } = req.body || {};
    if (!userId || !points) return res.status(400).json({ message: 'userId and points are required' });
    const entry = await RewardPointLedger.create({ user: userId, type: 'adjust', points, reason: reason || 'admin_adjust' });
    const balance = await RewardPointLedger.getBalance(userId);
    res.status(201).json({ success: true, entry, balance });
  } catch (err) {
    res.status(500).json({ message: 'Failed to adjust rewards', error: err.message });
  }
});

module.exports = router;
