const mongoose = require('mongoose');

const vendorLeadSchema = new mongoose.Schema({
  business_name: { type: String, required: true, maxlength: 100 },
  contact_person: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, index: true },
  phone: { type: String, required: true, index: true },
  region: { type: String, required: true },
  city: { type: String, required: true },
  product_category: { type: String, required: true },
  storefront_description: { type: String, maxlength: 500 },
  referral_source: { type: String },
  consent: { type: Boolean, default: false },
  status: { type: String, enum: ['new', 'reviewed', 'invited', 'rejected'], default: 'new' },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes: { type: String, maxlength: 500 }
}, { timestamps: true });

module.exports = mongoose.model('VendorLead', vendorLeadSchema);
