const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { protect, authorize } = require('../middleware/authMiddleware');

// Submit feedback (customer or vendor)
router.post('/', protect, authorize('customer', 'vendor', 'admin'), async (req, res) => {
  try {
    const feedback = new Feedback({
      user: req.user._id,
      role: req.user.role,
      message: req.body.message,
      rating: req.body.rating,
      category: req.body.category
    });
    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted' });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', details: err.message });
    }
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
});

// Get all feedback (admin/staff only)
router.get('/', protect, authorize('admin', 'global_admin', 'staff'), async (req, res) => {
  try {
    const allFeedback = await Feedback.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });
    res.json(allFeedback);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load feedback' });
  }
});

module.exports = router;