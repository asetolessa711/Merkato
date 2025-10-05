const mongoose = require('mongoose');

const imageSubSchema = new mongoose.Schema(
  {
    urlOriginal: { type: String, required: true },
    urlHero: { type: String },
    urlThumb: { type: String },
    widthOriginal: { type: Number },
    heightOriginal: { type: Number },
    widthHero: { type: Number },
    heightHero: { type: Number },
    widthThumb: { type: Number },
    heightThumb: { type: Number },
  cropPreset: { type: String, enum: ['original','1:1','4:5'], default: 'original' },
    mime: { type: String },
    alt: { type: String, default: '' },
    variantKey: { type: String, default: '' }, // e.g., color name
  cropPreset: { type: String, enum: ['1:1','4:5','original'], default: 'original' },
    order: { type: Number, default: 0 },
    moderation: {
      status: { type: String, enum: ['submitted', 'approved', 'rejected'], default: 'submitted' },
      rejectedReason: { type: String, default: '' },
      approvedBy: { type: String },
      approvedAt: { type: Date }
    }
  },
  { _id: true, timestamps: true }
);

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
  // Images: support both legacy simple strings and new vendor-driven gallery
  images: { type: [String], default: [] },
  image: { type: String, default: '' },
  gallery: { type: [imageSubSchema], default: [] },
  heroImageId: { type: mongoose.Schema.Types.ObjectId },
  // Publish status
  status: { type: String, enum: ['draft', 'live'], default: 'draft', index: true },
  publishedAt: { type: Date },
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
