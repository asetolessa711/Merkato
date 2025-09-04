// File: backend/models/FirstTimeDiscount.js
const mongoose = require('mongoose');

const firstTimeDiscountSchema = new mongoose.Schema({
  active: { type: Boolean, default: false },
  percentage: { type: Number, default: 10 } // ✅ New dynamic percentage
});

module.exports = mongoose.model('FirstTimeDiscount', firstTimeDiscountSchema);
