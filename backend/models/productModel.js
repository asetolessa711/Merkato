const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String }
      }
    ],
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tags: [String],
    ratings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5 },
        comment: String
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);