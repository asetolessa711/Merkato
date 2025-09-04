const express = require('express');
const router = express.Router();
const BehaviorEvent = require('../models/BehaviorEvent');
const { protect } = require('../middleware/authMiddleware');
const { FEATURE_GAMIFICATION } = require('../utils/flags');
const RewardPointLedger = require('../models/RewardPointLedger');

// Ingest arbitrary events (anonymous)
router.post('/events', async (req, res) => {
  try {
    const { anonymousId, userId, eventName, props, ts } = req.body || {};
    if (!eventName) return res.status(400).json({ message: 'eventName required' });

    const doc = new BehaviorEvent({
      anonymousId: anonymousId || req.headers['x-anon-id'] || null,
      user: userId || null,
      eventName,
      props: props || {},
      ts: ts ? new Date(ts) : new Date(),
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
    });
    await doc.save();
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record event', error: err.message });
  }
});

// Merge anonymous history into user on login
router.post('/merge', protect, async (req, res) => {
  try {
    const { anonymousId } = req.body || {};
    if (!anonymousId) return res.status(400).json({ message: 'anonymousId required' });
    await BehaviorEvent.updateMany(
      { anonymousId, user: { $exists: false } },
      { $set: { user: req.user._id } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to merge events', error: err.message });
  }
});

// Simple daily check-in (idempotent per day per user)
router.post('/checkin', protect, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const exists = await BehaviorEvent.findOne({
      user: req.user._id,
      eventName: 'check_in',
      ts: { $gte: todayStart },
    }).lean();
    if (exists) return res.json({ success: true, alreadyCheckedIn: true });
    await BehaviorEvent.create({ user: req.user._id, eventName: 'check_in' });
    // Optional small reward for daily check-in
    if (FEATURE_GAMIFICATION) {
      try {
        await RewardPointLedger.create({ user: req.user._id, type: 'earn', points: 5, reason: 'daily_check_in' });
      } catch (e) {
        // non-blocking
      }
    }
    res.status(201).json({ success: true, alreadyCheckedIn: false });
  } catch (err) {
    res.status(500).json({ message: 'Failed to check in', error: err.message });
  }
});

module.exports = router;
