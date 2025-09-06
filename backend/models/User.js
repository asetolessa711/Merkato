const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

module.exports = mongoose.model('User', userSchema);
