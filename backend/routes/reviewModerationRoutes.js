// File: routes/reviewModerationRoutes.js – Admin Review Moderation
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    Get all flagged or recent reviews
// @route   GET /api/admin/reviews
// @access  Private (admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const reviews = await Review.find({ $or: [{ isFlagged: true }, { status: { $ne: 'visible' } }] })
      .populate('user', 'name email')
      .populate('product', 'name');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load reviews' });
  }
});

// @desc    Approve (unflag) a review
// @route   PATCH /api/admin/reviews/:id/approve
// @access  Private (admin only)
router.patch('/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.isFlagged = false;
    review.status = 'visible';
    review.moderatedBy = req.user._id;
    await review.save();

    res.json({ message: 'Review approved and made visible' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve review' });
  }
});

// @desc    Hide a review
// @route   PATCH /api/admin/reviews/:id/hide
// @access  Private (admin only)
router.patch('/:id/hide', protect, authorize('admin'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.status = 'hidden';
    review.moderatedBy = req.user._id;
    await review.save();

    res.json({ message: 'Review hidden from public' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to hide review' });
  }
});

// @desc    Delete a review
// @route   DELETE /api/admin/reviews/:id
// @access  Private (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.json({ message: 'Review permanently deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete review' });
  }
});

module.exports = router;
