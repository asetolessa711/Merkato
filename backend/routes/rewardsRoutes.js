const express = require('express');
const router = express.Router();
const BehaviorEvent = require('../models/BehaviorEvent');
const { protect } = require('../middleware/authMiddleware');

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

async function alreadyClaimed(userId, eventName) {
  const last = await BehaviorEvent.findOne({ user: userId, eventName }).sort('-ts');
  return last && isSameDay(new Date(last.ts || last.createdAt), new Date());
}

// POST /api/rewards/checkin
router.post('/checkin', protect, async (req, res) => {
  try {
    if (await alreadyClaimed(req.user._id, 'daily_check_in')) {
      return res.status(200).json({ message: 'Already claimed today', reward: null });
    }
    await BehaviorEvent.create({ user: req.user._id, eventName: 'daily_check_in', ts: new Date() });
    res.json({ reward: { type: 'points', amount: 10 } });
  } catch (err) {
    res.status(500).json({ message: 'Check-in failed' });
  }
});

// POST /api/rewards/spin
router.post('/spin', protect, async (req, res) => {
  try {
    if (await alreadyClaimed(req.user._id, 'spin')) {
      return res.status(200).json({ message: 'Spin already used today', reward: null });
    }
    const pool = [
      { type: 'coupon', value: 5 },
      { type: 'coupon', value: 10 },
      { type: 'free_shipping' },
      { type: 'points', amount: 20 },
    ];
    const reward = pool[Math.floor(Math.random() * pool.length)];
    await BehaviorEvent.create({ user: req.user._id, eventName: 'spin', props: { reward }, ts: new Date() });
    res.json({ reward });
  } catch (err) {
    res.status(500).json({ message: 'Spin failed' });
  }
});

module.exports = router;

