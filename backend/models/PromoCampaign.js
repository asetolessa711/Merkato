const mongoose = require('mongoose');

const promoCampaignSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  appliesToFirstTimeUsersOnly: { type: Boolean, default: false },
  minOrderValue: { type: Number },
  usageLimit: { type: Number },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('PromoCampaign', promoCampaignSchema);
