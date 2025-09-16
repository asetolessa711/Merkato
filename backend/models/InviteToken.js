const mongoose = require('mongoose');

const inviteTokenSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  usedAt: { type: Date, default: null },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorLead' }
}, { timestamps: true });

inviteTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('InviteToken', inviteTokenSchema);
