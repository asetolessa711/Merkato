const mongoose = require('mongoose');

const deliveryOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true // e.g., Standard, Express, Priority
  },
  description: {
    type: String // Optional: e.g., "3–5 days delivery"
  },
  cost: {
    type: Number,
    default: 0
  },
  days: {
    type: String,
    required: true // e.g., "3-5 days", "Same day"
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryOption', deliveryOptionSchema);
