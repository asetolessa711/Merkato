const express = require('express');
const router = express.Router();
const BehaviorEvent = require('../models/BehaviorEvent');
const { optionalAuth } = require('../middleware/authMiddleware');

function enabled(method) {
  switch (method) {
    case 'stripe': return !!process.env.STRIPE_PUBLISHABLE_KEY;
    case 'paypal': return !!process.env.PAYPAL_CLIENT_ID;
    case 'telebirr': return true; // existing local gateway, toggle via env later
    case 'mobile_wallet': return !!process.env.MOBILE_WALLET_ENABLED;
    default: return false;
  }
}

// GET /api/payments/methods?country=ET
router.get('/methods', (req, res) => {
  const methods = [];
  if (enabled('stripe')) methods.push({
    code: 'stripe',
    type: 'card',
    displayName: 'Credit/Debit Card (Stripe)',
    requiresArtifact: true,
    artifactKeys: ['paymentIntentId', 'cardToken', 'paymentToken'],
    captureFlow: 'intent',
    client: { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null },
    supportsUnauthenticated: true,
  });
  if (enabled('paypal')) methods.push({
    code: 'paypal',
    type: 'wallet',
    displayName: 'PayPal',
    requiresArtifact: true,
    artifactKeys: ['approvalId', 'orderId'],
    captureFlow: 'approval',
    client: { clientId: process.env.PAYPAL_CLIENT_ID || null },
    supportsUnauthenticated: true,
  });
  if (enabled('mobile_wallet')) methods.push({
    code: 'mobile_wallet',
    type: 'wallet',
    displayName: 'Mobile Wallet',
    requiresArtifact: true,
    artifactKeys: ['walletRef', 'transactionRef'],
    captureFlow: 'redirect',
    client: {},
    supportsUnauthenticated: true,
  });
  if (enabled('telebirr')) methods.push({
    code: 'telebirr',
    type: 'local',
    displayName: 'Telebirr',
    requiresArtifact: true,
    artifactKeys: ['transactionRef', 'sessionId'],
    captureFlow: 'redirect',
    client: {},
    supportsUnauthenticated: true,
  });
  // Offline method metadata (orders accept without prior artifact)
  methods.push({
    code: 'cod',
    type: 'offline',
    displayName: 'Cash on Delivery',
    requiresArtifact: false,
    artifactKeys: [],
    captureFlow: 'offline',
    client: {},
    supportsUnauthenticated: true,
  });
  res.json({ methods });
});

// POST /api/payments/intent { method, amount, currency }
router.post('/intent', optionalAuth, async (req, res) => {
  try {
    const { method, amount, currency, metadata } = req.body || {};
    if (!method || !amount || !currency) return res.status(400).json({ message: 'method, amount, currency are required' });
    const now = Date.now();
    const result = { method, amount, currency, mock: true, metadata: metadata || null };
    if (method === 'stripe') {
      result.intentId = `pi_${now}`;
      result.clientSecret = `cs_${now}`;
    } else if (method === 'paypal') {
      result.approvalId = `paypal_${now}`;
      result.approvalUrl = `https://paypal.test/approve/${now}`;
    } else if (method === 'mobile_wallet') {
      result.walletRef = `wallet_${now}`;
      result.redirectUrl = `https://wallet.test/pay/${now}`;
    } else if (method === 'telebirr') {
      result.sessionId = `tele_${now}`;
      result.redirectUrl = `https://telebirr.test/session/${now}`;
    }
    else return res.status(400).json({ message: 'Unsupported payment method' });

    // log behavior
    try {
      await BehaviorEvent.create({ user: req.user?._id, eventName: 'payment_intent_created', props: { method, amount, currency } });
    } catch (_) {}
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create payment intent' });
  }
});

// POST /api/payments/verify { method, artifact }
// Lightweight verifier for E2E/test; extend with provider SDKs in prod
router.post('/verify', optionalAuth, async (req, res) => {
  try {
    const { method, artifact } = req.body || {};
    if (!method || !artifact || typeof artifact !== 'object') {
      return res.status(400).json({ message: 'method and artifact are required' });
    }
    let verified = false;
    let status = 'pending';
    if (method === 'stripe' && (artifact.paymentIntentId || artifact.cardToken || artifact.paymentToken)) {
      verified = true; status = 'authorized';
    } else if (method === 'paypal' && (artifact.approvalId || artifact.orderId)) {
      verified = true; status = 'authorized';
    } else if (method === 'mobile_wallet' && (artifact.walletRef || artifact.transactionRef)) {
      verified = true; status = 'authorized';
    } else if (method === 'telebirr' && (artifact.transactionRef || artifact.sessionId)) {
      verified = true; status = 'authorized';
    }

    try { await BehaviorEvent.create({ user: req.user?._id, eventName: 'payment_verified', props: { method, verified } }); } catch (_) {}
    if (!verified) return res.status(400).json({ verified: false, status: 'invalid_artifact' });
    return res.json({ verified: true, status });
  } catch (err) {
    return res.status(500).json({ message: 'Verification failed' });
  }
});

// Generic webhook receiver for providers (test-friendly stub)
router.post('/webhook/:provider', async (req, res) => {
  // In test/dev, accept payload and return 200.
  try {
    const provider = req.params.provider;
    try { await BehaviorEvent.create({ eventName: 'payment_webhook', props: { provider } }); } catch (_) {}
    return res.status(200).json({ received: true, provider });
  } catch (err) {
    return res.status(200).end();
  }
});

module.exports = router;
