const express = require('express');
const router = express.Router();
const IS_TEST = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
let stripeClient = null;

function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    if (IS_TEST) {
      // Minimal mock for tests to avoid external dependency
      stripeClient = {
        checkout: {
          sessions: {
            create: async () => ({ id: `cs_test_${Date.now()}`, url: 'https://stripe.test/checkout' })
          }
        }
      };
      return stripeClient;
    }
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  stripeClient = require('stripe')(key);
  return stripeClient;
}
const { protect, authorize } = require('../middleware/authMiddleware');
const Product = require('../models/Product');

router.post('/create-checkout-session', protect, authorize('customer'), async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const stripe = getStripe();
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
