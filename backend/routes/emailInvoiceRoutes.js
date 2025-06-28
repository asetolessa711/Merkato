const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const Order = require('../models/Order');
const { ensureAuth } = require('../middleware/authMiddleware');

router.post('/:id/email-invoice', ensureAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer')
      .populate('vendor')
      .populate('products.product');

    if (!order || !order.customer?.email) {
      return res.status(404).json({ message: 'Order or customer email not found.' });
    }

    const logoUrl = order.vendor?.logo || 'https://yourdomain.com/default-logo.png';

    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; }
            .header img { height: 50px; }
            .title { font-size: 1.5rem; color: #00B894; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .footer { margin-top: 40px; font-size: 0.9em; color: #888; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" alt="Vendor Logo" />
            <div class="title">Merkato Invoice</div>
          </div>

          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
          <p><strong>Total:</strong> ${order.currency} ${order.total.toFixed(2)}</p>
          ${order.promoCode ? `<p><strong>Promo:</strong> ${order.promoCode.code} (-${order.discount})</p>` : ''}

          <h3>Items</h3>
          <table>
            <thead>
              <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${order.products.map(p => `
                <tr>
                  <td>${p.product.name}</td>
                  <td>${p.quantity}</td>
                  <td>${order.currency} ${p.product.price.toFixed(2)}</td>
                  <td>${order.currency} ${(p.product.price * p.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Thank you for shopping with ${order.vendor?.name || 'Merkato'}!
          </div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Merkato" <${process.env.EMAIL_USER}>`,
      to: order.customer.email,
      subject: 'Your Merkato Invoice',
      text: 'Please find your invoice attached.',
      attachments: [
        {
          filename: `invoice_${order._id}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    order.emailLog = {
      status: 'sent',
      sentAt: new Date(),
      to: order.customer.email
    };
    await order.save();

    res.status(200).json({ message: 'Invoice emailed successfully.' });
  } catch (error) {
    console.error('Invoice email error:', error);
    try {
      const order = await Order.findById(req.params.id);
      order.emailLog = {
        status: 'failed',
        error: error.message,
        sentAt: new Date()
      };
      await order.save();
    } catch {}
    res.status(500).json({ message: 'Something went wrong sending the invoice.' });
  }
});

module.exports = router;
