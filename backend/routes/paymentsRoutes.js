const express = require('express');
const router = express.Router();

// Simple catalogue of available payment methods for the frontend
// type can be: 'cod' | 'card' | 'wallet' | 'redirect'
const METHODS = [
  { code: 'cod', displayName: 'Cash on Delivery', type: 'cod' },
  { code: 'stripe', displayName: 'Pay with Card (Stripe)', type: 'card' },
  { code: 'paypal', displayName: 'PayPal', type: 'redirect' },
  { code: 'mobile_wallet', displayName: 'Mobile Wallet', type: 'wallet' },
  { code: 'telebirr', displayName: 'Pay with Telebirr', type: 'redirect' },
];

// GET /api/payments/methods
router.get('/methods', (_req, res) => {
  res.json({ methods: METHODS });
});

// POST /api/payments/intent
// Accepts: { method, amount, currency }
// Returns a mock artifact compatible with orderRoutes artifact checks
router.post('/intent', (req, res) => {
  const { method, amount, currency } = req.body || {};
  const m = String(method || '').toLowerCase();

  // Basic validation
  if (!m) return res.status(400).json({ message: 'method is required' });
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    return res.status(400).json({ message: 'amount must be a non-negative number' });
  }

  // Generate lightweight artifacts per method; no external calls for tests/local
  const id = Math.random().toString(36).slice(2);
  if (m === 'stripe' || m === 'chapa') {
    return res.json({ success: true, intentId: `pi_${id}`, clientSecret: `cs_${id}`, amount, currency: currency || 'USD' });
  }
  if (m === 'paypal') {
    return res.json({ success: true, approvalId: `appr_${id}`, approvalUrl: `https://paypal.example/approve/${id}` });
  }
  if (m === 'mobile_wallet') {
    return res.json({ success: true, walletRef: `wallet_${id}`, transactionRef: `tx_${id}` });
  }
  if (m === 'telebirr') {
    return res.json({ success: true, sessionId: `tele_${id}`, redirectUrl: `https://telebirr.example/session/${id}` });
  }

  // Default: treat as COD (no artifact needed)
  return res.json({ success: true });
});

module.exports = router;
