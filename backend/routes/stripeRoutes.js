const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { protect, authorize } = require('../middleware/authMiddleware');
const Product = require('../models/Product');

router.post('/create-checkout-session', protect, authorize('customer'), async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: product.currency.toLowerCase(),
            product_data: {
              name: product.name
            },
            unit_amount: Math.round(product.price * 100) // Stripe uses cents
          },
          quantity
        }
      ],
      success_url: `${process.env.CLIENT_URL}/account/orders?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/product/${productId}`
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Stripe session creation failed' });
  }
});

module.exports = router;