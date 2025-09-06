// backend/routes/testSeedOrdersRoute.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { ensureAuth } = require('../middleware/authMiddleware');

// POST /api/test/seed-orders — simple order seeding for E2E
router.post('/test/seed-orders', ensureAuth, async (req, res) => {
  try {
    const customer = await User.findOne({ roles: { $in: ['customer'] } });
    // Prefer currently authenticated vendor for deterministic vendor views
    let vendor = null;
    const roles = req.user?.roles || [];
    if (roles.includes('vendor')) {
      vendor = req.user;
    } else {
      vendor = await User.findOne({ roles: { $in: ['vendor'] } });
    }
    const product = await Product.findOne();

    if (!customer || !vendor || !product) {
      return res.status(400).json({ message: 'Missing customer, vendor, or product to seed orders.' });
    }

  // Ensure at least one order for this vendor; do not nuke all orders in CI where admin tests might rely on counts
  await Order.deleteMany({ 'vendors.vendorId': vendor._id });

    const orders = [
      {
        buyer: customer._id,
        vendors: [
          {
            vendorId: vendor._id,
            products: [
              { product: product._id, name: product.name, quantity: 1, price: product.price, subtotal: product.price, tax: product.price * 0.15 }
            ],
            subtotal: product.price,
            tax: product.price * 0.15,
            shipping: 5,
            discount: 0,
            total: product.price * 1.15 + 5,
            commissionRate: 0.1,
            commissionAmount: product.price * 0.1,
            netEarnings: product.price * 1.15 + 5 - product.price * 0.1,
            currency: 'USD',
            status: 'pending',
            deliveryStatus: 'processing'
          }
        ],
        total: product.price * 1.15 + 5,
        totalAfterDiscount: product.price * 1.15 + 5,
        discount: 0,
        currency: 'USD',
        paymentMethod: 'card',
        shippingAddress: { fullName: 'Seeded User', city: 'Testville', country: 'US' },
        deliveryOption: { name: 'Standard', cost: 5, days: 3 },
        status: 'pending',
        orderDate: new Date()
      }
    ];

    await Order.create(orders);

    res.status(200).json({ message: 'Test orders seeded successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to seed test orders.' });
  }
});

module.exports = router;
