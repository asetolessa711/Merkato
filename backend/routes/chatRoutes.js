// routes/chatRoutes.js – Backend API for Direct Chat
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

// ✅ Get chat between current user and a target user
router.get('/:targetUserId', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.targetUserId;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages', error: err.message });
  }
});

// ✅ Send message
router.post('/', protect, async (req, res) => {
  try {
    const { receiver, content } = req.body;
    const sender = req.user._id;

    const message = new Message({ sender, receiver, content });
    await message.save();

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

module.exports = router;
