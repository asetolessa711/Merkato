// File: routes/productRoutes.js – Merged Final Version with AI Flagging, Role Access, Public APIs
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/authMiddleware');
const Flag = require('../models/Flag');
const DeliverySettings = require('../models/DeliverySettings');
const { buildTaxonomy, filterAndSort, computeChildren } = require('../utils/taxonomy');

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('vendor', 'name email');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load products' });
  }
});

// Public: Get delivery defaults (global ETA and shipping options)
router.get('/delivery-settings', async (req, res) => {
  try {
    let settings = await DeliverySettings.findOne();
    if (!settings) settings = await DeliverySettings.create({});
    res.json({
      defaultEtaDays: settings.defaultEtaDays,
      defaultEtaNote: settings.defaultEtaNote,
      shippingOptions: settings.shippingOptions || []
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load delivery settings' });
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
    const body = req.body || {};
    // 1) Validate category against taxonomy: must be a leaf and visible for upload
    const { categories } = await buildTaxonomy();
    const filtered = filterAndSort(categories, { visibleIn: 'upload', country: (req.user.country || '').toUpperCase() });
    const { byId, children } = computeChildren(filtered);
    // Allow selection by slug or id; fallback to simple label string
    const chosenSlug = body.categorySlug || body.category;
    const chosen = [...byId.values()].find(c => c.slug === chosenSlug || c.id === chosenSlug || c.name === body.category);
    if (!chosen) {
      return res.status(400).json({ message: 'Invalid or unsupported category' });
    }
    if ((children.get(chosen.id) || []).length > 0) {
      return res.status(400).json({ message: 'Please choose a more specific category' });
    }

    // 2) Validate dynamic attributes: required fields present
    const attrs = Array.isArray(chosen.attributes) ? chosen.attributes : [];
    const attrObj = body.attributes || {};
    for (const a of attrs) {
      if (a.required) {
        const val = attrObj[a.key];
        if (val === undefined || val === null || val === '') {
          return res.status(400).json({ message: `${a.label || a.key} is required` });
        }
      }
    }

    // Compute category path slugs for SEO
    const pathIds = Array.isArray(chosen.path) ? chosen.path.slice() : [];
    const pathSlugs = pathIds.map(id => byId.get(id)?.slug).filter(Boolean);

    const product = new Product({
      ...body,
      category: body.category || chosen.name,
      categoryId: chosen.id,
      categorySlug: chosen.slug,
      categoryPathIds: pathIds,
      categoryPathSlugs: pathSlugs,
      attributes: attrObj,
      images: Array.isArray(body.images) ? body.images : (body.image ? [body.image] : []),
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
    const body = req.body || {};
    const update = { ...body };
    // If category changes, re-validate leaf-only and attributes
    if (body.category || body.categorySlug || body.attributes) {
      const { categories } = await buildTaxonomy();
      const filtered = filterAndSort(categories, { visibleIn: 'upload', country: (req.user.country || '').toUpperCase() });
      const { byId, children } = computeChildren(filtered);
      const chosenSlug = body.categorySlug || body.category;
      const chosen = chosenSlug ? [...byId.values()].find(c => c.slug === chosenSlug || c.id === chosenSlug || c.name === body.category) : null;
      if (chosen) {
        if ((children.get(chosen.id) || []).length > 0) {
          return res.status(400).json({ message: 'Please choose a more specific category' });
        }
        const attrs = Array.isArray(chosen.attributes) ? chosen.attributes : [];
        const attrObj = body.attributes || {};
        for (const a of attrs) {
          if (a.required) {
            const val = attrObj[a.key];
            if (val === undefined || val === null || val === '') {
              return res.status(400).json({ message: `${a.label || a.key} is required` });
            }
          }
        }
        const pathIds = Array.isArray(chosen.path) ? chosen.path.slice() : [];
        const pathSlugs = pathIds.map(id => byId.get(id)?.slug).filter(Boolean);
        update.category = body.category || chosen.name;
        update.categoryId = chosen.id;
        update.categorySlug = chosen.slug;
        update.categoryPathIds = pathIds;
        update.categoryPathSlugs = pathSlugs;
        update.attributes = attrObj;
      }
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, vendor: req.user._id },
      update,
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found or not authorized' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// ✅ Update product ETA fields (vendor/admin)
router.put('/:id/eta', protect, authorize('vendor', 'admin'), async (req, res) => {
  try {
    const { deliveryEtaDays, deliveryEtaNote } = req.body;
    const update = {};
    if (typeof deliveryEtaDays === 'number') update.deliveryEtaDays = deliveryEtaDays;
    if (typeof deliveryEtaNote === 'string') update.deliveryEtaNote = deliveryEtaNote;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, vendor: req.user._id },
      { $set: update },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found or not authorized' });
    res.json({ message: 'ETA updated', product });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product ETA' });
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
