const mongoose = require('mongoose');
const {
  generateProductExternalId,
  isLikelyMongoObjectId,
  isValidProductExternalId,
} = require('../utils/externalId');

const productSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      unique: true,
      sparse: true,
      immutable: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => !value || isValidProductExternalId(value),
        message: 'Invalid canonical product external ID format',
      },
    },
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

productSchema.pre('validate', async function (next) {
  try {
    if (this.isNew && !this.externalId) {
      this.externalId = generateProductExternalId();
      if (String(process.env.PRODUCT_EXTERNAL_ID_LOG || '').toLowerCase() === 'true') {
        console.info(`[product-foundation] Assigned externalId=${this.externalId} for product=${this.name}`);
      }
    }

    if (!this.isNew && this.isModified('externalId')) {
      this.invalidate('externalId', 'externalId is immutable once assigned');
      return next();
    }

    const needsUniquenessCheck = this.externalId && (this.isNew || this.isModified('externalId'));
    if (!needsUniquenessCheck) {
      return next();
    }

    const allowCheckWhileDisconnected =
      String(process.env.PRODUCT_EXTERNAL_ID_TEST_UNIQUENESS || '').toLowerCase() === 'true';
    const hasLiveDbConnection = this.constructor.db && this.constructor.db.readyState === 1;
    if (!hasLiveDbConnection && !allowCheckWhileDisconnected) {
      return next();
    }

    const duplicate = await this.constructor.exists({
      externalId: this.externalId,
      _id: { $ne: this._id },
    });

    if (duplicate) {
      this.invalidate('externalId', 'externalId is already in use');
    }

    next();
  } catch (err) {
    next(err);
  }
});

productSchema.methods.getCanonicalIdentityKey = function () {
  return this.externalId || String(this._id);
};

productSchema.statics.isCanonicalExternalId = function (value) {
  return isValidProductExternalId(value);
};

productSchema.statics.findByCanonicalIdentity = async function (identityKey, projection = null, options = {}) {
  const normalized = String(identityKey || '').trim().toLowerCase();
  if (!normalized) return null;
  if (isValidProductExternalId(normalized)) {
    return this.findOne({ externalId: normalized }, projection, options);
  }
  if (isLikelyMongoObjectId(normalized)) {
    return this.findById(normalized, projection, options);
  }
  return null;
};

module.exports = mongoose.model('Product', productSchema);
