// File: backend/models/Flag.js
const mongoose = require('mongoose');

const flagSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null if flagged by AI
  },
  reason: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['AI', 'customer', 'admin'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'removed'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewNote: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Flag', flagSchema);
