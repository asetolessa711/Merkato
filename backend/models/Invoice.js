const mongoose = require('mongoose');
const {
  generateInvoiceExternalId,
  isLikelyMongoObjectId,
  isValidInvoiceExternalId,
} = require('../utils/externalId');

const invoiceSchema = new mongoose.Schema(
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
        validator: (value) => !value || isValidInvoiceExternalId(value),
        message: 'Invalid canonical invoice external ID format',
      },
    },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        quantity: Number,
        price: Number,
        subtotal: Number,
        tax: Number
      }
    ],
    subtotal: Number,
    tax: Number,
    shipping: Number,
    discount: Number,
    commission: Number,
    total: Number,
    netAmount: Number,
    currency: { type: String, default: 'USD' },
    dueDate: { type: Date },
    paidAt: { type: Date }
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

invoiceSchema.pre('validate', async function (next) {
  try {
    if (this.isNew && !this.externalId) {
      this.externalId = generateInvoiceExternalId();
      if (String(process.env.INVOICE_EXTERNAL_ID_LOG || '').toLowerCase() === 'true') {
        console.info(`[invoice-foundation] Assigned externalId=${this.externalId} for invoiceMongoId=${String(this._id)}`);
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
      String(process.env.INVOICE_EXTERNAL_ID_TEST_UNIQUENESS || '').toLowerCase() === 'true';
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

invoiceSchema.methods.getCanonicalIdentityKey = function () {
  return this.externalId || String(this._id);
};

invoiceSchema.statics.isCanonicalExternalId = function (value) {
  return isValidInvoiceExternalId(value);
};

invoiceSchema.statics.findByCanonicalIdentity = async function (identityKey, projection = null, options = {}) {
  const normalized = String(identityKey || '').trim().toLowerCase();
  if (!normalized) return null;
  if (isValidInvoiceExternalId(normalized)) {
    return this.findOne({ externalId: normalized }, projection, options);
  }
  if (isLikelyMongoObjectId(normalized)) {
    return this.findById(normalized, projection, options);
  }
  return null;
};

module.exports = mongoose.model('Invoice', invoiceSchema);
