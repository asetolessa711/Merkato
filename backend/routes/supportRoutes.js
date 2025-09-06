const express = require('express');
const router = express.Router();
const Support = require('../models/Support');
const { protect, authorize } = require('../middleware/authMiddleware');

// Submit support message (customer/vendor)
// Accepts subject and message, returns created ticket
router.post('/', protect, authorize('customer', 'vendor', 'admin'), async (req, res) => {
  try {
    const { subject, message, category } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    const support = new Support({
      user: req.user._id,
      category: category || 'general',
      message,
      subject: subject || undefined
    });
    // Ensure subject is included in the returned object
    await support.save();
    // Return the created ticket (including _id)
    res.status(201).json(support);
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit support request' });
  }
});
// Allow users to view their own tickets
router.get('/user', protect, authorize('customer', 'vendor', 'admin'), async (req, res) => {
  try {
    const tickets = await Support.find({ user: req.user._id }).sort({ createdAt: -1 });
    if (!tickets || tickets.length === 0) {
      return res.status(404).json({ message: 'No tickets found' });
    }
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load user tickets' });
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