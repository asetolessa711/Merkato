const mongoose = require('mongoose');

const VendorLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, index: true },
    phone: { type: String },
    company: { type: String },
    country: { type: String },
    status: { type: String, enum: ['new', 'contacted', 'invited', 'converted', 'rejected'], default: 'new', index: true },
    notes: { type: String },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.VendorLead || mongoose.model('VendorLead', VendorLeadSchema);
