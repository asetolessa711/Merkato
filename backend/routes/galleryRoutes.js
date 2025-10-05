const express = require('express');
const router = express.Router({ mergeParams: true });
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/authMiddleware');
const { enqueue } = require('../utils/derivativeQueue');

// Helpers
function requireVendorOwner(product, userId) {
  return product && product.vendor && String(product.vendor) === String(userId);
}

// Create/update full image list
router.post('/vendor/products/:id/images', protect, authorize('vendor','admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!(req.user.role === 'admin' || requireVendorOwner(product, req.user._id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { images } = req.body || {};
    if (!Array.isArray(images)) return res.status(400).json({ message: 'images[] required' });
    // Basic validation
    const normalized = images.map((img, idx) => ({
      urlOriginal: String(img.urlOriginal || ''),
      urlHero: img.urlHero || '',
      urlThumb: img.urlThumb || '',
      widthOriginal: img.widthOriginal || null,
      heightOriginal: img.heightOriginal || null,
      widthHero: img.widthHero || null,
      heightHero: img.heightHero || null,
      widthThumb: img.widthThumb || null,
      heightThumb: img.heightThumb || null,
      mime: img.mime || '',
      alt: img.alt || '',
      variantKey: img.variantKey || '',
      cropPreset: img.cropPreset || 'original',
      order: Number(img.order ?? idx),
      moderation: {
        status: img.moderation?.status || 'submitted',
        rejectedReason: img.moderation?.rejectedReason || '',
        approvedBy: img.moderation?.approvedBy || '',
        approvedAt: img.moderation?.approvedAt || null
      }
    }));
    product.gallery = normalized;
    await product.save();
    // Enqueue derivatives for any images missing hero/thumb
    if (String(process.env.IMG_DERIVATIVES_ENABLED || 'false').toLowerCase() === 'true') {
      for (const g of product.gallery) {
        if ((!g.urlHero || !g.urlThumb) && g.urlOriginal) {
          enqueue({ productId: product._id, imageId: g._id, urlOriginal: g.urlOriginal, cropPreset: g.cropPreset || 'original' });
        }
      }
    }
    res.json({ ok: true, gallery: product.gallery });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save images', error: err.message });
  }
});

// Reorder
router.put('/vendor/products/:id/images/reorder', protect, authorize('vendor','admin'), async (req,res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!(req.user.role === 'admin' || requireVendorOwner(product, req.user._id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { order } = req.body || {}; // array of ids in desired order
    if (!Array.isArray(order)) return res.status(400).json({ message: 'order[] required' });
    const map = new Map(product.gallery.map((g) => [String(g._id), g]));
    const next = [];
    order.forEach((id, idx) => { const g = map.get(String(id)); if (g) { g.order = idx; next.push(g); map.delete(String(id)); } });
    // append any remaining
    Array.from(map.values()).forEach((g) => { g.order = next.length; next.push(g); });
    product.gallery = next;
    await product.save();
    res.json({ ok: true, gallery: product.gallery });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reorder images', error: err.message });
  }
});

// Update single image (alt, variantKey)
router.put('/vendor/products/:id/images/:imageId', protect, authorize('vendor','admin'), async (req,res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!(req.user.role === 'admin' || requireVendorOwner(product, req.user._id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const g = product.gallery.id(req.params.imageId);
    if (!g) return res.status(404).json({ message: 'Image not found' });
    if (typeof req.body.alt === 'string') g.alt = req.body.alt;
    if (typeof req.body.variantKey === 'string') g.variantKey = req.body.variantKey;
    await product.save();
    res.json({ ok: true, image: g });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update image', error: err.message });
  }
});

// Delete single image
router.delete('/vendor/products/:id/images/:imageId', protect, authorize('vendor','admin'), async (req,res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!(req.user.role === 'admin' || requireVendorOwner(product, req.user._id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const g = product.gallery.id(req.params.imageId);
    if (!g) return res.status(404).json({ message: 'Image not found' });
    g.deleteOne();
    await product.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete image', error: err.message });
  }
});

// Moderation: approve/reject
router.post('/moderation/products/:id/images:approve', protect, authorize('admin'), async (req,res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const { imageId, approvedBy } = req.body || {};
    const g = product.gallery.id(imageId);
    if (!g) return res.status(404).json({ message: 'Image not found' });
    g.moderation.status = 'approved';
    g.moderation.approvedBy = approvedBy || String(req.user._id);
    g.moderation.approvedAt = new Date();
    await product.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Approve failed', error: err.message });
  }
});

router.post('/moderation/products/:id/images:reject', protect, authorize('admin'), async (req,res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const { imageId, reason } = req.body || {};
    const g = product.gallery.id(imageId);
    if (!g) return res.status(404).json({ message: 'Image not found' });
    g.moderation.status = 'rejected';
    g.moderation.rejectedReason = reason || '';
    await product.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Reject failed', error: err.message });
  }
});

module.exports = router;

// Also export a small helper for other routes/tests
module.exports.countApprovedImages = function countApprovedImages(product) {
  return Array.isArray(product?.gallery)
    ? product.gallery.filter((g) => g?.moderation?.status === 'approved').length
    : 0;
};

