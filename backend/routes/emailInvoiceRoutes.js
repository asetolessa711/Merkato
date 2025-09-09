const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const Order = require('../models/Order');
const { ensureAuth } = require('../middleware/authMiddleware');

router.post('/:id/email-invoice', ensureAuth, async (req, res) => {
  try {
    // Match current Order schema: buyer, vendors[], vendors.products[], etc.
    const order = await Order.findById(req.params.id)
      .populate('buyer')
      .populate('vendors.vendorId')
      .populate('vendors.products.product');

    if (!order || !order.buyer?.email) {
      return res.status(404).json({ message: 'Order or customer email not found.' });
    }

    const firstVendor = order.vendors && order.vendors[0] ? order.vendors[0].vendorId : null;
    const logoUrl = (firstVendor && firstVendor.logo) || 'https://yourdomain.com/default-logo.png';

    const itemsRows = (order.vendors || [])
      .flatMap(v => (v.products || []).map(p => {
        const prod = p.product || {};
        const qty = p.quantity || 0;
        const unit = Number(prod.price || 0);
        const name = prod.name || 'Item';
        const currency = order.currency || 'USD';
        return `
                <tr>
                  <td>${name}</td>
                  <td>${qty}</td>
                  <td>${currency} ${unit.toFixed(2)}</td>
                  <td>${currency} ${(unit * qty).toFixed(2)}</td>
                </tr>
              `;
      }))
      .join('');

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
          <p><strong>Total:</strong> ${(order.currency || 'USD')} ${Number(order.total || 0).toFixed(2)}</p>

          <h3>Items</h3>
          <table>
            <thead>
              <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="footer">
            Thank you for shopping with ${(firstVendor && firstVendor.name) || 'Merkato'}!
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
      to: order.buyer.email,
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
      to: order.buyer.email
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
