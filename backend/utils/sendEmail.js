const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

// Environment variables with validation
const {
  EMAIL_USER = process.env.EMAIL_USER,
  EMAIL_PASS = process.env.EMAIL_PASS,
  BASE_URL = process.env.CLIENT_URL || 'http://localhost:3000',
  EMAIL_FROM = `Merkato <${EMAIL_USER}>`
} = process.env;

// Validate required environment variables
if (!EMAIL_USER || !EMAIL_PASS) {
  throw new Error('❌ EMAIL_USER and EMAIL_PASS must be set in environment variables');
}

// Enhanced transporter with TLS
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  tls: {
    rejectUnauthorized: true,
    minVersion: "TLSv1.2"
  }
});

// Email Templates
const templates = {
  base: (title, content) => `
    <div style="font-family:'Poppins',sans-serif;background:#f9f9f9;padding:20px">
      <div style="max-width:600px;margin:auto;background:#fff;padding:24px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
        <h2 style="color:#00B894;margin-bottom:20px">${title}</h2>
        ${content}
        <hr style="margin-top:20px;border:0;border-top:1px solid #eee">
        <p style="font-size:0.85rem;color:#666;text-align:center;margin-top:20px">
          This email was sent from <strong>Merkato Marketplace</strong>.<br>
          Please do not reply to this email.
        </p>
      </div>
    </div>
  `,
  order: (order, productListHtml) => `
    <p>Your order <strong>#${order._id}</strong> has been placed successfully.</p>
    <p><strong>Total:</strong> ${order.currency} ${order.total.toFixed(2)}</p>
    <p><strong>Shipping:</strong> ${order.shippingAddress}</p>
    <h4>Items:</h4>
    <ul style="padding-left:20px">${productListHtml}</ul>
    <p>Visit your <a href="${BASE_URL}/account/orders" style="color:#00B894;text-decoration:none">order history</a> to track your purchase.</p>
  `,
  resetPassword: (resetUrl) => `
    <p>You requested a password reset for your Merkato account.</p>
    <p>Click the link below to set a new password (valid for 1 hour):</p>
    <p style="text-align:center;margin:30px 0">
      <a href="${resetUrl}" 
         style="background:#00B894;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block">
         Reset Password
      </a>
    </p>
    <p style="color:#666;font-size:0.9em">If you didn't request this, you can safely ignore this email.</p>
    <p style="color:#666;font-size:0.9em">For security reasons, this link will expire in 1 hour.</p>
  `
};

// Send Email with HTML + plain text fallback
async function sendEmail(options) {
  try {
    await transporter.verify();

    const result = await transporter.sendMail({
      ...options,
      from: EMAIL_FROM,
      text: options.text || options.html.replace(/<[^>]+>/g, '') // ✅ Plaintext fallback
    });

    console.log(`📨 Email sent successfully to ${options.to}`);
    return result;
  } catch (err) {
    console.error(`❌ Email send failed:`, {
      to: options.to,
      error: err.message,
      timestamp: new Date().toISOString()
    });
    throw new Error('Failed to send email. Please try again later.');
  }
}

// Order Confirmation Email
const sendOrderConfirmation = async ({ to, order }) => {
  const productList = order.products.map(p =>
    `<li>${p.product?.name || 'Product'} × ${p.quantity}</li>`
  ).join('');

  const html = templates.base('Order Confirmation', templates.order(order, productList));

  return sendEmail({
    to,
    subject: `Order Confirmation - Merkato #${order._id}`,
    html
  });
};

// Password Reset Email
const sendPasswordResetEmail = async ({ to, token }) => {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
  const html = templates.base('Reset Your Merkato Password', templates.resetPassword(resetUrl));

  return sendEmail({
    to,
    subject: 'Reset Your Password - Merkato',
    html
  });
};

// Rate Limiter for forgot-password
const resetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    message: 'Too many password reset requests. Please wait 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      message: 'Too many reset attempts. Please try again in 15 minutes.'
    });
  }
});

// Development Test Utility
const testEmailConfig = async () => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      await transporter.verify();
      console.log('✅ Email configuration verified successfully');
    } catch (err) {
      console.error('❌ Email configuration error:', err.message);
    }
  }
};

module.exports = {
  sendOrderConfirmation,
  sendPasswordResetEmail,
  resetRateLimiter,
  testEmailConfig
};
