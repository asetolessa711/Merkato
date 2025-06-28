const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all reviews for a product
router.get('/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Submit a review (customer)
router.post('/:productId', protect, authorize('customer', 'admin'), async (req, res) => {
  try {
    const existing = await Review.findOne({
      user: req.user._id,
      product: req.params.productId
    });

    if (existing) {
      return res.status(400).json({ message: 'You already reviewed this product' });
    }

    const review = new Review({
      user: req.user._id,
      product: req.params.productId,
      rating: req.body.rating,
      comment: req.body.comment
    });

    await review.save();
    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit review' });
  }
});

// Delete a review (customer)
router.delete('/:id', protect, authorize('customer', 'admin', 'global_admin'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'global_admin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await review.remove();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete review' });
  }
});

module.exports = router;