const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Optional for anonymous feedback
    },
    role: {
      type: String,
      enum: ['customer', 'vendor', 'admin', 'anonymous'],
      default: 'anonymous'
    },
    message: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    category: {
      type: String,
      enum: ['ux', 'feature', 'complaint', 'other'],
      default: 'other'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);