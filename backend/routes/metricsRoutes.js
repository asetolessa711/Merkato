const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const dq = require('../utils/derivativeQueue');

// Admin-only metrics for derivative queue (distinct path to avoid clashing with public simple metrics)
router.get('/metrics/derivatives/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const enabled = String(process.env.IMG_DERIVATIVES_ENABLED || 'false').toLowerCase() === 'true';
    const stats = typeof dq.metrics === 'function' ? dq.metrics() : {};
    res.json({ ok: true, enabled, ...stats });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Failed to read metrics' });
  }
});

module.exports = router;