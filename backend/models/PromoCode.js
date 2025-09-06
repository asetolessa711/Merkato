const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  value: { type: Number, required: true },
  minOrderValue: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  appliesToFirstTimeUsersOnly: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ✅ Add this line inside the schema
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCampaign',
    default: null
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('PromoCode', promoCodeSchema);
