const mongoose = require('mongoose');

const deliverySettingsSchema = new mongoose.Schema(
  {
    // Global default ETA days when product doesn't specify one
    defaultEtaDays: { type: Number, default: 5, min: 0 },
    defaultEtaNote: { type: String, default: 'Standard delivery', maxlength: 200 },

    // Optional: shipping options presets to show at checkout (name, cost, days)
    shippingOptions: [
      {
        name: { type: String, required: true },
        cost: { type: Number, default: 0, min: 0 },
        days: { type: Number, default: 5, min: 0 }
      }
    ],

    // Audit
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliverySettings', deliverySettingsSchema);
