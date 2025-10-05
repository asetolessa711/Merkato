
// File: routes/vendorRoutes.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/authMiddleware');
const { Parser } = require('json2csv');
const VendorLead = require('../models/VendorLead');
const InviteToken = require('../models/InviteToken');
const jwt = require('jsonwebtoken');

// Lightweight slugify for matching vendor storefront slugs
function slugify(s) {
  return String(s || '')
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function publicVendor(user) {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    storeName: user.storeName || user.name,
    storeDescription: user.storeDescription || '',
    profileImage: user.profileImage || '',
    bio: user.bio || '',
    country: user.country || '',
    slug: slugify(user.storeName || user.name)
  };
}

// Public: get vendor profile by id
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !(user.roles || []).includes('vendor') || user.isActive === false) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(publicVendor(user));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load vendor profile' });
  }
});

// Authenticated: get my vendor profile
router.get('/profile/me', protect, authorize('vendor'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(publicVendor(user));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

// Public: resolve vendor by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const s = slugify(req.params.slug);
    // Narrow to vendors and map to find slug match
    const candidate = await User.findOne({ roles: 'vendor', isActive: { $ne: false } }).where('storeName').exists(true);
    // Fast path by storeName exact lower-case match if available
    let user = null;
    if (candidate) {
      // Fallback to broader search in case there are many
      const list = await User.find({ roles: 'vendor', isActive: { $ne: false } }).select('name storeName email profileImage storeDescription country');
      user = (list || []).find(u => slugify(u.storeName || u.name) === s) || null;
    }
    if (!user) return res.status(404).json({ message: 'Vendor not found' });
    res.json(publicVendor(user));
  } catch (err) {
    res.status(500).json({ message: 'Failed to resolve vendor' });
  }
});

// Public: minimal customization by vendor id
router.get('/customization/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('storeName');
    if (!user) return res.json({ theme: 'mint', backgroundColor: '#ffffff', textColor: '#333333', bannerImage: '' });
    // In absence of a stored theme, derive deterministic color by hash of id
    const themes = [
      { theme: 'mint', backgroundColor: '#f7fff9', textColor: '#1b4332' },
      { theme: 'ocean', backgroundColor: '#f0f9ff', textColor: '#0c4a6e' },
      { theme: 'sunset', backgroundColor: '#fff7ed', textColor: '#7c2d12' },
    ];
    const idx = Math.abs(String(user._id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % themes.length;
    res.json({ ...themes[idx], bannerImage: '' });
  } catch (err) {
    res.status(200).json({ theme: 'mint', backgroundColor: '#ffffff', textColor: '#333333', bannerImage: '' });
  }
});
// Create a new product (vendor only)
router.post('/products', protect, authorize('vendor'), async (req, res) => {
  try {
    const { name, price, image, stock, description, category } = req.body;
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }
    const product = new Product({
      name,
      price,
      image,
      stock,
      description,
      category,
      vendor: req.user._id
    });
    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create product', error: err.message });
  }
});

// Get all products for the logged-in vendor
router.get('/products', protect, authorize('vendor'), async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.user._id });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load vendor products', error: err.message });
  }
});

// Get revenue summary for logged-in vendor
router.get('/revenue', protect, authorize('vendor'), async (req, res) => {
  try {
    const range = String(req.query.range || '30d');
    // Placeholder: compute naive revenue as price*stock for demo; ignore date filtering
    const products = await Product.find({ vendor: req.user._id });
    const totalRevenue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);
    res.json({ totalRevenue: totalRevenue.toFixed(2), productCount: products.length, range });
  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate revenue' });
  }
});

// Vendor analytics summary
router.get('/analytics', protect, authorize('vendor'), async (req, res) => {
  try {
    const vendorId = req.user._id?.toString();
    const orders = await Order.find({ 'vendors.products.product': { $exists: true } })
      .populate({ path: 'vendors.products.product', options: { strictPopulate: false } })
      .populate('buyer', 'name email');

    let totalRevenue = 0;
    let totalItemsSold = 0;
    let orderCount = 0;
    const uniqueBuyers = new Set();

    orders.forEach(order => {
      if (!Array.isArray(order.vendors)) return;

      // Find the vendor segment(s) belonging to this vendor in the order
      const vendorSegments = order.vendors.filter(v => v.vendorId?.toString() === vendorId);
      if (vendorSegments.length === 0) return;

      orderCount += 1;
      if (order.buyer?._id) uniqueBuyers.add(order.buyer._id.toString());

      vendorSegments.forEach(vs => {
        if (!Array.isArray(vs.products)) return;
        vs.products.forEach(item => {
          const price = item.product?.price || 0;
          const qty = item.quantity || 0;
          totalRevenue += qty * price;
          totalItemsSold += qty;
        });
      });
    });

    res.json({
      totalRevenue: totalRevenue.toFixed(2),
      totalItemsSold,
      orderCount,
      uniqueCustomers: uniqueBuyers.size
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load vendor analytics', error: err.message });
  }
});

// Top products sold by vendor
router.get('/top-products', protect, authorize('vendor'), async (req, res) => {
  try {
    const vendorId = req.user._id?.toString();
    const orders = await Order.find({ 'vendors.products.product': { $exists: true } })
      .populate({ path: 'vendors.products.product', options: { strictPopulate: false } });

    const productMap = {};

    orders.forEach(order => {
      if (!Array.isArray(order.vendors)) return;
      order.vendors
        .filter(v => v.vendorId?.toString() === vendorId)
        .forEach(v => {
          if (!Array.isArray(v.products)) return;
          v.products.forEach(p => {
            const prod = p.product;
            if (!prod?._id) return;
            const key = prod._id.toString();
            if (!productMap[key]) {
              productMap[key] = { name: prod.name, quantity: 0 };
            }
            productMap[key].quantity += (p.quantity || 0);
          });
        });
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.json(topProducts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load top products' });
  }
});

// Top customers for vendor
router.get('/top-customers', protect, authorize('vendor'), async (req, res) => {
  try {
    const vendorId = req.user._id?.toString();
    const orders = await Order.find({ 'vendors.products.product': { $exists: true } })
      .populate({ path: 'vendors.products.product', options: { strictPopulate: false } })
      .populate('buyer');

    const customerMap = {};

    orders.forEach(order => {
      if (!Array.isArray(order.vendors)) return;

      let totalForVendor = 0;
      order.vendors
        .filter(v => v.vendorId?.toString() === vendorId)
        .forEach(v => {
          if (!Array.isArray(v.products)) return;
          v.products.forEach(p => {
            const price = p.product?.price || 0;
            const qty = p.quantity || 0;
            totalForVendor += qty * price;
          });
        });

      if (totalForVendor > 0 && order.buyer?._id) {
        const key = order.buyer._id.toString();
        if (!customerMap[key]) {
          customerMap[key] = {
            name: order.buyer.name,
            email: order.buyer.email,
            total: 0
          };
        }
        customerMap[key].total += totalForVendor;
      }
    });

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    res.json(topCustomers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load top customers' });
  }
});

// Update a product (only if vendor owns it)
router.put('/products/:id', protect, authorize('vendor'), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, vendor: req.user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not authorized' });
    }

    Object.assign(product, req.body);
    const updated = await product.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product', error: err.message });
  }
});

// Delete a product (only if vendor owns it)
router.delete('/products/:id', protect, authorize('vendor'), async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, vendor: req.user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not authorized' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product', error: err.message });
  }
});

// ✅ Public route to fetch all vendors (for homepage)
router.get('/public', async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor' }).select('name email _id avatar');
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch vendors' });
  }
});

// ✅ NEW: Update vendor profile (avatar)
router.put('/profile', protect, authorize('vendor'), async (req, res) => {
  try {
    const vendor = await User.findById(req.user._id);

    if (!vendor || !Array.isArray(vendor.roles) || !vendor.roles.includes('vendor')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    vendor.avatar = req.body.avatar || vendor.avatar;
    await vendor.save();

    res.json({
      message: 'Vendor profile updated successfully',
      avatar: vendor.avatar
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
});

module.exports = router;
// --- Onboarding: Public Vendor Registration ---
router.post('/register', async (req, res) => {
  try {
    const {
      business_name,
      contact_person,
      phone,
      email,
      region,
      city,
      product_category,
      storefront_description,
      referral_source,
      consent
    } = req.body || {};

    if (!business_name || business_name.length > 100) return res.status(422).json({ code: 'INVALID_BUSINESS_NAME' });
    if (!contact_person || contact_person.length < 2) return res.status(422).json({ code: 'INVALID_CONTACT_PERSON' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(422).json({ code: 'INVALID_EMAIL' });
    if (!phone || !/^\+?[1-9]\d{7,14}$/.test(phone)) return res.status(422).json({ code: 'INVALID_PHONE' });
    if (!region || !city) return res.status(422).json({ code: 'INVALID_REGION_CITY' });
    if (!product_category) return res.status(422).json({ code: 'INVALID_PRODUCT_CATEGORY' });
    if (storefront_description && storefront_description.length > 500) return res.status(422).json({ code: 'INVALID_STOREFRONT_DESC' });

    // Enforce uniqueness on email/phone among leads
    const dup = await VendorLead.findOne({ $or: [{ email }, { phone }] });
    if (dup) return res.status(409).json({ code: 'DUPLICATE_LEAD' });

    const lead = await VendorLead.create({
      business_name,
      contact_person,
      phone,
      email,
      region,
      city,
      product_category,
      storefront_description,
      referral_source,
      consent: !!consent,
      status: 'new'
    });

    res.status(201).json({ message: 'Lead submitted', id: lead._id });
  } catch (err) {
    res.status(400).json({ code: 'INVALID_INPUT', error: err.message });
  }
});

// Verify onboarding invite token and mark as used (single-use)
router.post('/invite/verify', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ code: 'MISSING_TOKEN' });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ code: 'INVALID_TOKEN' });
    }
    const record = await InviteToken.findOne({ token });
    if (!record) return res.status(404).json({ code: 'TOKEN_NOT_FOUND' });
    if (record.used) return res.status(410).json({ code: 'TOKEN_ALREADY_USED' });
    if (record.expiresAt && record.expiresAt < new Date()) return res.status(410).json({ code: 'TOKEN_EXPIRED' });

    record.used = true;
    record.usedAt = new Date();
    await record.save();

    res.json({ ok: true, leadId: decoded.leadId, email: decoded.email });
  } catch (err) {
    res.status(500).json({ code: 'VERIFY_FAILED' });
  }
});

// Mark onboarding complete for current vendor (requires MFA confirmation in future)
router.post('/onboarding/complete', protect, authorize('vendor'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.vendorStatus = 'onboarded';
    await user.save();
    res.json({ message: 'Onboarding marked complete' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to complete onboarding' });
  }
});

