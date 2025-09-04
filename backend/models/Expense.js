const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ['marketing', 'staff', 'logistics', 'platform', 'vendor_payout', 'other'],
      default: 'other'
    },
    country: { type: String }, // For country-specific admins
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);