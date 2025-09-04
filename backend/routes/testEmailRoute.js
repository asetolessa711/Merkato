// routes/testEmailRoute.js
const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/sendEmail'); // <-- Use destructuring

router.get('/', async (req, res) => {
  try {
  // Don’t expose this route in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  // Official contact address for the ecosystem; safe fallback in non-prod and tests
  // Precedence: explicit override via MERKATO_TEST_EMAIL_TO, otherwise official fallback
  const to = (process.env.MERKATO_TEST_EMAIL_TO && process.env.MERKATO_TEST_EMAIL_TO.trim()) || 'qa@merkato.test';
    await sendEmail({
      to,
      subject: '📧 Test Email from Merkato',
      text: '✅ This is a test email sent from the Merkato backend.'
    });

    res.status(200).json({ success: true, message: 'Test email sent!' });
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send email.', error: error.message });
  }
});

module.exports = router;