const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  generateExternalId,
  isLikelyMongoObjectId,
  isValidExternalId,
} = require('../utils/externalId');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      unique: true,
      required: true
    },
    externalId: {
      type: String,
      unique: true,
      sparse: true,
      immutable: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => !value || isValidExternalId(value),
        message: 'Invalid canonical external ID format',
      },
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    roles: {
      type: [String],
      enum: ['customer', 'vendor', 'admin', 'global_admin', 'country_admin'],
      default: ['customer']
    },
  // ✅ Phase 2: Vendor approval & status flags
  vendorApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
    country: {
      type: String,
      required: true
    },
    savedAddresses: [
      {
        label: { type: String },
        fullName: { type: String },
        phone: { type: String },
        street: { type: String },
        city: { type: String },
        postalCode: { type: String },
        country: { type: String },
        isDefault: { type: Boolean, default: false }
      }
    ],
    bio: {
      type: String,
      maxlength: 300
    },
    profileImage: {
      type: String
    },
    storeName: {
      type: String,
      maxlength: 100
    },
    storeDescription: {
      type: String,
      maxlength: 500
    },
    // Vendor onboarding fields
    vendorStatus: { type: String, enum: ['new', 'reviewed', 'invited', 'onboarded', 'verified', 'active', 'rejected'], default: 'new' },
    trust_badge: { type: Boolean, default: false },
    businessRegistryId: { type: String },
    taxId: { type: String },
    bankDetails: {
      iban: { type: String },
      swift: { type: String }
    },
    // Password reset fields
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    }
  },
  { timestamps: true }
);

userSchema.pre('validate', async function (next) {
  try {
    if (this.isNew && !this.externalId) {
      this.externalId = generateExternalId();
      if (String(process.env.IDENTITY_EXTERNAL_ID_LOG || '').toLowerCase() === 'true') {
        console.info(`[identity-foundation] Assigned externalId=${this.externalId} for user email=${this.email}`);
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
      String(process.env.IDENTITY_EXTERNAL_ID_TEST_UNIQUENESS || '').toLowerCase() === 'true';
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

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getCanonicalIdentityKey = function () {
  return this.externalId || String(this._id);
};

userSchema.statics.isCanonicalExternalId = function (value) {
  return isValidExternalId(value);
};

userSchema.statics.findByCanonicalIdentity = async function (identityKey, projection = null, options = {}) {
  const normalized = String(identityKey || '').trim().toLowerCase();
  if (!normalized) return null;
  if (isValidExternalId(normalized)) {
    return this.findOne({ externalId: normalized }, projection, options);
  }
  if (isLikelyMongoObjectId(normalized)) {
    return this.findById(normalized, projection, options);
  }
  return null;
};

userSchema.methods.getCanonicalVendorIdentityKey = function () {
  const roles = Array.isArray(this.roles) ? this.roles : [];
  if (!roles.includes('vendor')) return null;
  return this.getCanonicalIdentityKey();
};

userSchema.statics.findVendorByCanonicalIdentity = async function (
  identityKey,
  projection = null,
  options = {}
) {
  const normalized = String(identityKey || '').trim().toLowerCase();
  if (!normalized) return null;
  if (isValidExternalId(normalized)) {
    return this.findOne({ externalId: normalized, roles: 'vendor' }, projection, options);
  }
  if (isLikelyMongoObjectId(normalized)) {
    return this.findOne({ _id: normalized, roles: 'vendor' }, projection, options);
  }
  return null;
};

module.exports = mongoose.model('User', userSchema);
