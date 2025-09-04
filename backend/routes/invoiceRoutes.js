const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { ensureAuth } = require('../middleware/authMiddleware');
const moment = require('moment');
const PDFDocument = require('pdfkit');

// ✅ REPORT ROUTE – Get all invoices for admin/vendor
router.get('/report', ensureAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
  const roles = req.user.roles || [];
  const isAdmin = roles.includes('admin') || roles.includes('global_admin');
  const vendorId = req.user._id;

    const query = isAdmin ? {} : { vendor: vendorId };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: moment(startDate).startOf('day').toDate(),
        $lte: moment(endDate).endOf('day').toDate()
      };
    }

  const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 });

    const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);

    res.json({
      totalInvoices: invoices.length,
      totalRevenue: totalRevenue.toFixed(2),
      invoices
    });
  } catch (error) {
    console.error('Invoice report error:', error);
    res.status(500).json({ message: 'Failed to generate report.' });
  }
});

// ✅ PDF DOWNLOAD ROUTE – Download a single invoice as PDF
router.get('/download/:id', ensureAuth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('vendor', 'storeName name email');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Restrict access to vendor who owns it (unless admin)
    const isAdmin = req.user.role === 'admin' || req.user.role === 'global_admin';
    if (!isAdmin && invoice.vendor?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice_${invoice._id}.pdf`
    );

    // 🧾 Header
    doc.fontSize(20).text(`Invoice #${invoice._id}`, { align: 'center' }).moveDown();

    doc.fontSize(12).text(`Vendor: ${invoice.vendor?.storeName || invoice.vendor?.name || 'N/A'} (${invoice.vendor?.email || 'N/A'})`);
    doc.text(`Customer: ${invoice.customer?.name || 'N/A'} (${invoice.customer?.email || 'N/A'})`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    // 💼 Items
    invoice.items?.forEach((item, i) => {
      doc.text(`${i + 1}. ${item.name} × ${item.quantity} @ $${item.price.toFixed(2)} = $${(item.price * item.quantity).toFixed(2)}`);
    });

    doc.moveDown();

    // 💰 Summary
    doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`);
    doc.text(`Tax: $${invoice.tax.toFixed(2)}`);
    doc.text(`Shipping: $${invoice.shipping.toFixed(2)}`);
    doc.text(`Discount: -$${invoice.discount.toFixed(2)}`);
    doc.text(`Commission: -$${invoice.commission.toFixed(2)}`);
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Total: $${invoice.total.toFixed(2)}`);
    doc.text(`Net Earnings: $${invoice.netAmount.toFixed(2)}`);
    doc.moveDown(2);

    // 🛡 Footer
    doc.fontSize(10).fillColor('#888').text('Powered by Merkato', { align: 'center' });

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ message: 'Error generating invoice PDF' });
  }
});


// GET /api/invoices/:orderId - Get invoice by orderId (with ObjectId validation)
const mongoose = require('mongoose');
router.get('/:orderId', ensureAuth, async (req, res) => {
  const { orderId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }
  try {
    // Find invoice by order field
    const invoice = await Invoice.findOne({ order: orderId })
      .populate('vendor', 'storeName name email');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    // Restrict access to vendor who owns it (unless admin)
    const isAdmin = req.user.role === 'admin' || req.user.role === 'global_admin';
    if (!isAdmin && invoice.vendor?._id?.toString() !== req.user._id.toString() && invoice.customer?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // Respond with invoice details (minimal for test)
    res.json({
      _id: invoice._id,
      invoiceNumber: invoice._id,
      order: invoice.order,
      vendor: invoice.vendor,
      customer: invoice.customer,
      total: invoice.total,
      createdAt: invoice.createdAt
    });
  } catch (error) {
    console.error('Invoice fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch invoice.' });
  }
});

module.exports = router;
