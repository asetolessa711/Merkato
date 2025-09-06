const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
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
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
