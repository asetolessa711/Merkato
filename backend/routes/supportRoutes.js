const express = require('express');
const router = express.Router();
const Support = require('../models/Support');
const { protect, authorize } = require('../middleware/authMiddleware');

// Submit support message (customer/vendor)
router.post('/', protect, authorize('customer', 'vendor', 'admin'), async (req, res) => {
  try {
    const support = new Support({
      user: req.user._id,
      category: req.body.category,
      message: req.body.message
    });
    await support.save();
    res.status(201).json({ message: 'Support message submitted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit support request' });
  }
});

// Get all support tickets (admin/staff only)
router.get('/', protect, authorize('admin', 'global_admin', 'staff'), async (req, res) => {
  try {
    const messages = await Support.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load support messages' });
  }
});

// Update support ticket (mark resolved / add admin note)
router.put('/:id', protect, authorize('admin', 'global_admin', 'staff'), async (req, res) => {
  try {
    const support = await Support.findById(req.params.id);
    if (!support) return res.status(404).json({ message: 'Ticket not found' });

    support.status = req.body.status || support.status;
    support.adminNote = req.body.adminNote || support.adminNote;

    await support.save();
    res.json({ message: 'Ticket updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update ticket' });
  }
});

module.exports = router;