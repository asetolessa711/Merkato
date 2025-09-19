const mongoose = require('mongoose');

const InviteTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, index: true, unique: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorLead', required: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.models.InviteToken || mongoose.model('InviteToken', InviteTokenSchema);
