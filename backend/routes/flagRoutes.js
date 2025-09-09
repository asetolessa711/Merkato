// File: routes/flagRoutes.js – Admin Flag Moderation System
const express = require('express');
const router = express.Router();
const Flag = require('../models/Flag');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    Get all product flags
// @route   GET /api/flags
// @access  Private (admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const flags = await Flag.find()
      .populate('product', 'name description price')
      .populate('flaggedBy', 'name email');
    res.json(flags);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch flags' });
  }
});

// @desc    Approve a flag (mark as resolved)
// @route   PATCH /api/flags/:id/approve
// @access  Private (admin only)
router.patch('/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const flag = await Flag.findById(req.params.id);
    if (!flag) return res.status(404).json({ message: 'Flag not found' });

  // Align with Flag schema: status enum ['pending','approved','removed']
  flag.status = 'approved';
  flag.reviewedBy = req.user._id;
  flag.reviewNote = 'approved';
  flag.resolvedAt = new Date();
  await flag.save();

  res.json({ message: 'Flag approved' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve flag' });
  }
});

// @desc    Reject a flag (delete product)
// @route   PATCH /api/flags/:id/reject
// @access  Private (admin only)
router.patch('/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const flag = await Flag.findById(req.params.id);
    if (!flag) return res.status(404).json({ message: 'Flag not found' });

  await Product.findByIdAndDelete(flag.product);
  // Set removed status and review metadata
  flag.status = 'removed';
  flag.reviewedBy = req.user._id;
  flag.reviewNote = 'rejected-product-deleted';
  flag.resolvedAt = new Date();
  await flag.save();

  res.json({ message: 'Flag rejected and product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject flag' });
  }
});

module.exports = router;
