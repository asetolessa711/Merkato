// File: routes/productRoutes.js – Merged Final Version with AI Flagging, Role Access, Public APIs
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/authMiddleware');
const Flag = require('../models/Flag');

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('vendor', 'name email');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get product' });
  }
});

// Get products by vendor ID (public storefront)
router.get('/vendor/:id', async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.params.id });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load vendor products' });
  }
});

// Upload new product (Vendor/Admin)
router.post('/', protect, authorize('vendor', 'admin'), async (req, res) => {
  try {
    const product = new Product({
      ...req.body,
      vendor: req.user._id,
      vendorCountry: req.user.country || 'global'
    });

    await product.save();

    // === AI Auto-Flagging ===
    const suspiciousPatterns = [/free money/i, /fake/i, /limited time/i];
    const suspiciousText = `${product.name} ${product.description}`;
    const isKeywordSuspicious = suspiciousPatterns.some(pattern => pattern.test(suspiciousText));
    const isPriceSuspicious = product.price <= 0;

    if (isKeywordSuspicious || isPriceSuspicious) {
      const aiFlag = new Flag({
        product: product._id,
        flaggedBy: null,
        reason: isKeywordSuspicious ? 'Suspicious keywords detected' : 'Suspicious pricing detected',
        source: 'AI'
      });
      await aiFlag.save();
    }
    // === End AI Flagging ===

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', protect, authorize('vendor', 'admin'), async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, vendor: req.user._id },
      req.body,
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found or not authorized' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// Delete product (Vendor or Admin or Country Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const isOwner = product.vendor.toString() === req.user._id.toString();
    const isGlobalAdmin = req.user.role === 'admin';
    const isCountryAdmin = req.user.role === 'country-admin' && product.vendorCountry === req.user.country;

    if (isOwner || isGlobalAdmin || isCountryAdmin) {
      await product.deleteOne();
      return res.json({ message: 'Product deleted successfully' });
    }

    res.status(403).json({ message: 'Not authorized to delete this product' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// Report a product (Customer)
router.post('/:id/report', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const flag = new Flag({
      product: product._id,
      flaggedBy: req.user._id,
      reason,
      source: 'customer'
    });

    await flag.save();
    res.status(201).json({ message: 'Product reported for review' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to report product' });
  }
});

module.exports = router;
