const mongoose = require('mongoose');

// Align schema with onboarding route (/api/vendor/register) while preserving legacy fields
const VendorLeadSchema = new mongoose.Schema(
  {
    // Legacy/compat fields
    name: { type: String }, // no longer required, replaced by contact_person
    company: { type: String },
    country: { type: String },

    // Onboarding fields used by the API
    business_name: { type: String },
    contact_person: { type: String },
    region: { type: String },
    city: { type: String },
    product_category: { type: String },
    storefront_description: { type: String },
    referral_source: { type: String },
    consent: { type: Boolean, default: false },

    // Common fields
    email: { type: String, required: true, lowercase: true, index: true },
    phone: { type: String },

    status: {
      type: String,
      enum: ['new', 'contacted', 'invited', 'converted', 'rejected'],
      default: 'new',
      index: true
    },
    notes: { type: String },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.models.VendorLead || mongoose.model('VendorLead', VendorLeadSchema);
