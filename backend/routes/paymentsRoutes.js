const express = require("express");

// Minimal payments route to support tests and future expansion.
// Intentionally simple: no external providers; validates input and returns stubbed data.
const router = express.Router();

// Health endpoint for quick checks
router.get("/health", (req, res) => {
	res.status(200).json({ ok: true });
});

// Create a client payment session (stub)
router.post("/session", (req, res) => {
	const { amount, currency } = req.body || {};
	if (typeof amount !== "number" || !currency) {
		return res
			.status(400)
			.json({ message: "amount (number) and currency are required" });
	}

	// Echo idempotency key if provided
	const idempotencyKey = req.get("Idempotency-Key") || null;
	const sessionId = `test_sess_${Math.random().toString(36).slice(2, 10)}`;

	return res.status(201).json({ sessionId, amount, currency, idempotencyKey });
});

// Webhook receiver (stub) — in production we'd verify signatures
router.post("/webhook", (req, res) => {
	return res.status(200).json({ received: true });
});

module.exports = router;

