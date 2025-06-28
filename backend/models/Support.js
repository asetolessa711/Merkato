const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    category: {
      type: String,
      enum: ['general', 'product', 'vendor', 'account', 'other'],
      default: 'general'
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open'
    },
    adminNote: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Support', supportSchema);