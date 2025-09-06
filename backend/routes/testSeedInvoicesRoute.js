// backend/routes/testSeedInvoicesRoute.js
const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/authMiddleware');
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// POST /api/test/seed-invoices — create a minimal invoice for tests
router.post('/test/seed-invoices', ensureAuth, async (req, res) => {
  try {
    // Prefer the authenticated vendor when available
    const authRoles = req.user?.roles || [];
    let vendor = null;
    if (authRoles.includes('vendor')) {
      vendor = req.user;
    } else {
      vendor = await User.findOne({ roles: { $in: ['vendor'] } });
    }
    const customer = await User.findOne({ roles: { $in: ['customer'] } });
    const order = await Order.findOne();
    const product = await Product.findOne();

    if (!vendor || !customer || !product) {
      return res.status(400).json({ message: 'Missing vendor/customer/product to seed invoices.' });
    }

    const subtotal = product.price || 20;
    const tax = Number((subtotal * 0.15).toFixed(2));
    const shipping = 5;
    const discount = 0;
    const commission = Number((subtotal * 0.1).toFixed(2));
    const total = Number((subtotal + tax + shipping - discount).toFixed(2));
    const netAmount = Number((total - commission).toFixed(2));

  const invoice = await Invoice.create({
      vendor: vendor._id,
      order: order?._id,
      items: [
        {
          product: product._id,
          name: product.name || 'Seed Product',
          quantity: 1,
          price: subtotal,
          subtotal,
          tax
        }
      ],
      subtotal,
      tax,
      shipping,
      discount,
      commission,
      total,
      netAmount,
      currency: 'USD',
      paidAt: null,
    });

    res.status(200).json({ message: 'Test invoice seeded', invoiceId: invoice._id });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to seed test invoices.' });
  }
});

module.exports = router;
