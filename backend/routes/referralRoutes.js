const express = require('express');
const router = express.Router();
const BehaviorEvent = require('../models/BehaviorEvent');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

function encodeRef(userId) {
  return Buffer.from(String(userId)).toString('base64url').replace(/=+$/,'');
}
function decodeRef(code) {
  try { return Buffer.from(code, 'base64url').toString('utf8'); } catch { return null; }
}

// GET /api/referrals/code
router.get('/code', protect, (req, res) => {
  res.json({ code: encodeRef(req.user._id) });
});

// POST /api/referrals/claim { code }
router.post('/claim', optionalAuth, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ message: 'code is required' });
    const referrerId = decodeRef(code);
    if (!referrerId) return res.status(400).json({ message: 'invalid code' });
    await BehaviorEvent.create({ user: req.user?._id, eventName: 'referral_claim', props: { referrerId } });
    res.json({ message: 'Referral claimed', reward: { type: 'coupon', value: 5 } });
  } catch (err) {
    res.status(500).json({ message: 'Referral claim failed' });
  }
});

module.exports = router;

