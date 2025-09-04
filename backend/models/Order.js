const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
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
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
