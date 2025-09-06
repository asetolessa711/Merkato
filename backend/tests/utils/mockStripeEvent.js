const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Generates a mock Stripe webhook event payload and signature for testing.
 * @param {Object|null} event - A full event object to use (optional).
 * @param {string} [type='payment_intent.succeeded'] - The Stripe event type.
 * @param {Object} [data={}] - The `data.object` to include in the event.
 * @param {Object} [options] - Additional config.
 * @param {number} [options.timestamp] - Custom timestamp override.
 * @param {string|null} [options.secret] - Stripe webhook secret for real signature.
 * @param {Object} [options.extraFields] - Extra fields to include in event payload.
 * @returns {{ payload: string, signature: string }} JSON payload and Stripe-Signature header.
 */
function mockStripeEvent(event = null, type = 'payment_intent.succeeded', data = {}, options = {}) {
  const {
    timestamp = Math.floor(Date.now() / 1000),
    secret = null,
    extraFields = {}
  } = options;

  const eventPayload = event || {
    id: `evt_${timestamp}`,
    object: 'event',
    type,
    data: { object: data },
    created: timestamp,
    livemode: false,
    ...extraFields
  };

  const payloadString = JSON.stringify(eventPayload);

  const signature = secret
    ? stripe.webhooks.generateTestHeaderString({ payload: payloadString, secret, timestamp })
    : generateSignatureHeader(payloadString, timestamp);

  return { payload: payloadString, signature };
}

/**
 * Generates a fake Stripe-Signature header for test purposes.
 * @param {string} payload
 * @param {number} [timestamp]
 * @returns {string} Fake Stripe-Signature header.
 */
function generateSignatureHeader(payload, timestamp = Math.floor(Date.now() / 1000)) {
  const fakeSignature = 'abcdef1234567890';
  return `t=${timestamp}, v1=${fakeSignature}, v0=${fakeSignature}`;
}

module.exports = {
  mockStripeEvent,
  generateSignatureHeader
};
