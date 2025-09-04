const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/pay', protect, authorize('customer'), async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // This simulates a successful Telebirr redirect
    const redirectUrl = `${process.env.CLIENT_URL}/account/orders?telebirr=success`;

    res.json({ message: 'Redirecting to Telebirr', url: redirectUrl });
  } catch (err) {
    res.status(500).json({ message: 'Telebirr simulation failed' });
  }
});

module.exports = router;