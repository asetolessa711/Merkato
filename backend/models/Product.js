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
    category: { type: String },
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

    // ✅ Promotion Field
    promotion: {
      isPromoted: { type: Boolean, default: false },
      badgeText: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
