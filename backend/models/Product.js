const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    currency: {
      type: String,
      enum: ['USD', 'ETB', 'EUR'],
      default: 'USD'
    },
    // Backward-compat simple category label
    category: { type: String },
    // Canonical taxonomy persistence (optional)
    categoryId: { type: String },
    categorySlug: { type: String },
    categoryPathIds: { type: [String], default: [] },
    categoryPathSlugs: { type: [String], default: [] },
    // Images: support multiple while keeping legacy single image
    images: { type: [String], default: [] },
    image: { type: String, default: '' },
    stock: { type: Number, default: 0 },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    language: {
      type: String,
      enum: ['en', 'am', 'or', 'it'],
      default: 'en'
    },
    // Dynamic vendor attributes keyed by taxonomy
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },

  // 🚚 Delivery ETA (Phase 1)
  // Estimated time (in days) to ship/deliver this product. If not set, use global default from DeliverySettings.
  deliveryEtaDays: { type: Number, min: 0 },
  deliveryEtaNote: { type: String, maxlength: 200 },

    // ✅ Promotion Field
    promotion: {
      isPromoted: { type: Boolean, default: false },
      badgeText: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
