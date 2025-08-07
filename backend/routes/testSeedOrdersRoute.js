// backend/routes/testSeedOrdersRoute.js
const express = require('express');
const router = express.Router();

// Import your seedOrders logic
const seedOrders = require('../seedOrders');

// POST /api/test/seed-orders
router.post('/test/seed-orders', async (req, res) => {
  try {
    await seedOrders();
    res.status(200).json({ message: 'Test orders seeded successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to seed test orders.' });
  }
});

module.exports = router;
