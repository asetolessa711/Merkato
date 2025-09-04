const mongoose = require('mongoose');

const RewardPointLedgerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['earn', 'redeem', 'expire', 'adjust'], required: true },
    points: { type: Number, required: true }, // positive for earn, negative for redeem/expire
    reason: { type: String, default: '' },
    metadata: { type: Object, default: {} },
    expiresAt: { type: Date }, // optional expiry for earned points
  },
  { timestamps: true }
);

// Convenience static to compute current balance
RewardPointLedgerSchema.statics.getBalance = async function (userId) {
  const res = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, balance: { $sum: '$points' } } },
  ]);
  return res?.[0]?.balance || 0;
};

module.exports = mongoose.model('RewardPointLedger', RewardPointLedgerSchema);
