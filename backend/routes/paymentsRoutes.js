const express = require("express");

// Minimal payments route to support tests and future expansion.
// Intentionally simple: no external providers; validates input and returns stubbed data.
const router = express.Router();

// Health endpoint for quick checks
router.get("/health", (req, res) => {
	res.status(200).json({ ok: true });
});

// naive in-memory idempotency cache for tests/local only
// key -> { bodyHash: string, response: object }
const idemCache = new Map();

// Create a client payment session (stub)
router.post("/session", (req, res) => {
	const { amount, currency } = req.body || {};
	const validAmount = typeof amount === "number" && isFinite(amount) && amount > 0;
	const validCurrency = typeof currency === "string" && /^[A-Z]{3}$/.test(currency);
	if (!validAmount || !validCurrency) {
		return res
			.status(400)
			.json({ message: "amount (>0 number) and currency (ISO 3-letter upper) are required" });
	}

	const idempotencyKey = req.get("Idempotency-Key") || null;

	// If an idempotency key is provided, ensure same response for same parameters
	if (idempotencyKey) {
		const bodyHash = JSON.stringify({ amount, currency });
		const existing = idemCache.get(idempotencyKey);
		if (existing) {
			if (existing.bodyHash !== bodyHash) {
				return res
					.status(409)
					.json({ message: "Idempotency key conflict: parameters differ" });
			}
			// replay previous success
			return res.status(201).json(existing.response);
		}
		const sessionId = `test_sess_${Math.random().toString(36).slice(2, 10)}`;
		const response = { sessionId, amount, currency, idempotencyKey };
		idemCache.set(idempotencyKey, { bodyHash, response });
		return res.status(201).json(response);
	}

	// No idempotency key provided: behave normally (non-idempotent)
	const sessionId = `test_sess_${Math.random().toString(36).slice(2, 10)}`;
	return res.status(201).json({ sessionId, amount, currency, idempotencyKey });
});

// Webhook receiver (stub) — in production we'd verify signatures
router.post("/webhook", (req, res) => {
	return res.status(200).json({ received: true });
});

module.exports = router;

