// routes/testEmailRoutes.js
const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/sendEmail'); // <-- Use destructuring

router.get('/', async (req, res) => {
  try {
    await sendEmail({
      to: 'waliinkanasefa2025@gmail.com',
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