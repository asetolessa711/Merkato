const mongoose = require('mongoose');
const {
  generateOrderExternalId,
  isLikelyMongoObjectId,
  isValidOrderExternalId,
} = require('../utils/externalId');

const orderSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      unique: true,
      sparse: true,
      immutable: true,
      lowercase: true,
      trim: true,
      select: false,
      validate: {
        validator: (value) => !value || isValidOrderExternalId(value),
        message: 'Invalid canonical order external ID format',
      },
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // NEW: Vendors array to support multi-vendor breakdown
    vendors: [
      {
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        products: [
          {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true, default: 1 }
          }
        ],
        subtotal: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        total: { type: Number, required: true },

        // Commission Logic
        commissionRate: { type: Number, default: 0.10 }, // 10%
        commissionAmount: { type: Number, default: 0 },
        netEarnings: { type: Number, default: 0 },

        // Currency & Status
        displayCurrency: { type: String, default: 'USD' },
        exchangeRate: { type: Number, default: 1 },
        status: {
          type: String,
          enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
          default: 'pending'
        },
        paidAt: { type: Date }
      }
    ],

    // Global order summary
    total: { type: Number, required: true },
    totalAfterDiscount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    promoCode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null
    },

    currency: {
      type: String,
      enum: ['USD', 'ETB', 'EUR'],
      default: 'USD'
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'telebirr', 'stripe', 'chapa'],
      default: 'cod'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    },
    shippingAddress: {
      fullName: { type: String },
      phone: { type: String },
      street: { type: String },
      city: { type: String },
      postalCode: { type: String },
      country: { type: String }
    },

    // Persist the selected delivery option from checkout
    deliveryOption: {
      name: { type: String },
      cost: { type: Number, default: 0 },
      // Accept either number of days or a string label (e.g., "3-5 days")
      days: { type: mongoose.Schema.Types.Mixed }
    },

    // Optional explicit order date separate from timestamps
    orderDate: { type: Date },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    statusHistory: [
      {
        status: { type: String },
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ],

    // Email Invoice Log (optional)
    emailLog: {
      status: { type: String, enum: ['sent', 'failed'] },
      to: { type: String },
      sentAt: { type: Date },
      error: { type: String }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.externalId;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        delete ret.externalId;
        return ret;
      },
    },
  }
);

orderSchema.pre('validate', async function (next) {
  try {
    if (this.isNew && !this.externalId) {
      this.externalId = generateOrderExternalId();
      if (String(process.env.ORDER_EXTERNAL_ID_LOG || '').toLowerCase() === 'true') {
        console.info(`[order-foundation] Assigned externalId=${this.externalId} for orderMongoId=${String(this._id)}`);
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
      String(process.env.ORDER_EXTERNAL_ID_TEST_UNIQUENESS || '').toLowerCase() === 'true';
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

orderSchema.methods.getCanonicalIdentityKey = function () {
  return this.externalId || String(this._id);
};

orderSchema.statics.isCanonicalExternalId = function (value) {
  return isValidOrderExternalId(value);
};

orderSchema.statics.findByCanonicalIdentity = async function (identityKey, projection = null, options = {}) {
  const normalized = String(identityKey || '').trim().toLowerCase();
  if (!normalized) return null;
  if (isValidOrderExternalId(normalized)) {
    return this.findOne({ externalId: normalized }, projection, options);
  }
  if (isLikelyMongoObjectId(normalized)) {
    return this.findById(normalized, projection, options);
  }
  return null;
};

module.exports = mongoose.model('Order', orderSchema);
