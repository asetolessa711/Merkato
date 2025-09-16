const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const FirstTimeDiscount = require('../models/FirstTimeDiscount');
const Order = require('../models/Order');
const Review = require('../models/Review');
const PromoCode = require('../models/PromoCode'); // ✅ NEW for promo logic
const { Parser } = require('json2csv');
const { protect, authorize } = require('../middleware/authMiddleware');
const PromoCampaign = require('../models/PromoCampaign');
const DeliverySettings = require('../models/DeliverySettings');
const VendorLead = require('../models/VendorLead');
const InviteToken = require('../models/InviteToken');
const jwt = require('jsonwebtoken');

// Utility: Check if user is Global, Admin, or Staff
const isAdmin = (user) =>
  ['global_admin', 'admin', 'staff'].includes(user.role);

// GET all users (Global/Admin only)
router.get('/users', protect, authorize('global_admin', 'admin'), async (req, res) => {
  try {
  const roles = req.user.roles || [req.user.role];
  const isScopedAdmin = roles.includes('admin') && !roles.includes('global_admin');
  const query = isScopedAdmin && req.user.country ? { country: req.user.country } : {};

    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// ✅ List vendors (optionally filter by approval status)
router.get('/vendors', protect, authorize('global_admin', 'admin', 'country_admin'), async (req, res) => {
  try {
    const filter = { roles: { $in: ['vendor'] } };
    if (req.query.approved === 'true') filter.vendorApproved = true;
    if (req.query.approved === 'false') filter.vendorApproved = { $ne: true };
  const roles = req.user.roles || [req.user.role];
  const restrictByCountry = roles.includes('admin') || roles.includes('country_admin');
  if (restrictByCountry && req.user.country) filter.country = req.user.country;
    const vendors = await User.find(filter).select('-password');
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load vendors' });
  }
});

// GET all products (filtered for admin by country)
router.get('/products', protect, authorize('global_admin', 'admin'), async (req, res) => {
  try {
    let products;
  const roles = req.user.roles || [req.user.role];
    if (roles.includes('admin') && req.user.country) {
      const vendors = await User.find({ roles: 'vendor', country: req.user.country }).select('_id');
      const vendorIds = vendors.map(v => v._id);
      products = await Product.find({ vendor: { $in: vendorIds } }).populate('vendor', 'name email');
    } else {
      products = await Product.find().populate('vendor', 'name email');
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load products' });
  }
});

// Simulated AI flag detection
router.get('/flags', protect, authorize('global_admin', 'admin', 'staff'), async (req, res) => {
  try {
    const flaggedProducts = await Product.find({
      $or: [
        { name: /free money/i },
        { description: /fake/i },
        { price: { $lt: 0 } }
      ]
    });

    const flags = flaggedProducts.map((product) => ({
      productId: product._id,
      reason: 'Suspicious product data',
      name: product.name,
      submittedBy: product.vendor
    }));

    res.json(flags);
  } catch (err) {
    res.status(500).json({ message: 'Failed to run AI flagging logic' });
  }
});

// Simulated revenue calculation
router.get('/revenue', protect, authorize('global_admin', 'admin'), async (req, res) => {
  try {
    let products = [];

  const roles = req.user.roles || [req.user.role];
    if (roles.includes('admin') && req.user.country) {
      const vendors = await User.find({ roles: 'vendor', country: req.user.country }).select('_id');
      const vendorIds = vendors.map(v => v._id);
      products = await Product.find({ vendor: { $in: vendorIds } });
    } else {
      products = await Product.find();
    }

    const totalRevenue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);

    res.json({
      totalRevenue: totalRevenue.toFixed(2),
      productCount: products.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate revenue', error: err.message });
  }
});

// POST: Create an expense (Admin only)
router.post('/expenses', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    const expense = new Expense({
      ...req.body,
      country: req.user.country || null,
      createdBy: req.user._id
    });

    const saved = await expense.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save expense', error: err.message });
  }
});

// GET: List expenses (filtered by country if needed)
router.get('/expenses', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin' && req.user.country
      ? { country: req.user.country }
      : {};

    const expenses = await Expense.find(filter).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch expenses', error: err.message });
  }
});

// ✅ Country Admin Dashboard Integration
router.get('/country-dashboard', protect, authorize('country_admin'), async (req, res) => {
  try {
    const countryCode = req.user.country;

  const totalVendors = await User.countDocuments({ roles: 'vendor', country: countryCode });
  const totalUsers = await User.countDocuments({ roles: 'customer', country: countryCode });
    const totalProducts = await Product.countDocuments({ country: countryCode });

    const totalRevenue = await Product.aggregate([
      { $match: { country: countryCode } },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $multiply: ['$price', { $ifNull: ['$stock', 0] }] } }
        }
      }
    ]);

    res.json({
      totalVendors,
      totalUsers,
      totalProducts,
      totalRevenue: totalRevenue[0]?.revenue || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch country dashboard data', error: err.message });
  }
});

// ✅ Toggle vendor active/suspended status
router.put('/users/:id/status', protect, authorize('admin', 'global_admin', 'country_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'vendor') {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    user.isActive = req.body.isActive;
    await user.save();

    res.json({ message: 'Vendor status updated', isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ message: 'Error updating vendor status', error: err.message });
  }
});

// ✅ Approve / Revoke vendor
router.put('/vendors/:id/approve', protect, authorize('admin', 'global_admin', 'country_admin'), async (req, res) => {
  try {
    const { approved } = req.body; // boolean
    const user = await User.findById(req.params.id);
    if (!user || !(user.roles || []).includes('vendor')) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    // Country admin can only manage vendors in same country
  const roles = req.user.roles || [req.user.role];
  if (roles.includes('country_admin') && user.country !== req.user.country) {
      return res.status(403).json({ message: 'Cross-country approval not allowed' });
    }
    user.vendorApproved = !!approved;
    await user.save();
    res.json({ message: approved ? 'Vendor approved' : 'Vendor approval revoked', vendorApproved: user.vendorApproved });
  } catch (err) {
    res.status(500).json({ message: 'Error updating vendor approval', error: err.message });
  }
});

// ✅ Get First-Time Discount Status
router.get('/first-time-discount', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    let setting = await FirstTimeDiscount.findOne();
    if (!setting) {
      setting = new FirstTimeDiscount();
      await setting.save();
      return res.json({ active: false, percentage: 10 });
    }
    res.json({ active: setting.active, percentage: setting.percentage });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch discount setting' });
  }
});

// ✅ Update First-Time Discount Status and Percentage
router.put('/first-time-discount', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    const { active, percentage } = req.body;
    let setting = await FirstTimeDiscount.findOne();
    if (!setting) {
      setting = new FirstTimeDiscount();
    }
    setting.active = active;
    setting.percentage = percentage || 10;
    await setting.save();
    res.json({ message: `First-time discount updated to ${percentage}% and ${active ? 'activated' : 'deactivated'}` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update discount setting' });
  }
});

// ✅ Delivery Settings (Phase 1: global ETA & shipping options)
router.get('/delivery-settings', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    let settings = await DeliverySettings.findOne();
    if (!settings) {
      settings = await DeliverySettings.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch delivery settings' });
  }
});

router.put('/delivery-settings', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    const { defaultEtaDays, defaultEtaNote, shippingOptions } = req.body;
    let settings = await DeliverySettings.findOne();
    if (!settings) settings = new DeliverySettings();
    if (typeof defaultEtaDays === 'number') settings.defaultEtaDays = defaultEtaDays;
    if (typeof defaultEtaNote === 'string') settings.defaultEtaNote = defaultEtaNote;
    if (Array.isArray(shippingOptions)) settings.shippingOptions = shippingOptions;
    settings.updatedBy = req.user._id;
    await settings.save();
    res.json({ message: 'Delivery settings updated', settings });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update delivery settings' });
  }
});

// ✅ Export admin summary as CSV
router.get('/export-summary', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    const userCount = await User.countDocuments();
  const vendorCount = await User.countDocuments({ roles: 'vendor' });
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    const reviewCount = await Review.countDocuments();

    const data = [{
      date: new Date().toISOString(),
      users: userCount,
      vendors: vendorCount,
      products: productCount,
      orders: orderCount,
      reviews: reviewCount
    }];

    const json2csv = new Parser();
    const csv = json2csv.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('merkato_summary_export.csv');
    return res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'Failed to export summary', error: err.message });
  }
});

// ✅ NEW: Validate Promo Code
router.post('/validate-promo', protect, async (req, res) => {
  const { code, totalBeforeDiscount } = req.body;
  const user = req.user;

  try {
    const promo = await PromoCode.findOne({ code, isActive: true });

    if (!promo) return res.status(404).json({ message: 'Promo code not found' });

    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Promo code has expired' });
    }

    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ message: 'Promo code usage limit reached' });
    }

    if (promo.appliesToFirstTimeUsersOnly) {
      const pastOrders = await Order.find({ user: user._id });
      if (pastOrders.length > 0) {
        return res.status(403).json({ message: 'Promo only valid for first-time users' });
      }
    }

    if (promo.minOrderValue && totalBeforeDiscount < promo.minOrderValue) {
      return res.status(400).json({ message: `Minimum order value is $${promo.minOrderValue}` });
    }

    let discount = 0;
    if (promo.type === 'percentage') {
      discount = (promo.value / 100) * totalBeforeDiscount;
    } else {
      discount = promo.value;
    }

    const totalAfterDiscount = Math.max(0, totalBeforeDiscount - discount);

    res.json({
      discount: discount.toFixed(2),
      totalAfterDiscount: totalAfterDiscount.toFixed(2),
      promoId: promo._id
    });

  } catch (err) {
    console.error('Promo validation failed:', err);
    res.status(500).json({ message: 'Failed to validate promo code' });
  }
});

router.post('/promo-campaigns', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      appliesToFirstTimeUsersOnly,
      minOrderValue,
      usageLimit
    } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const campaign = new PromoCampaign({
      name,
      description,
      startDate,
      endDate,
      appliesToFirstTimeUsersOnly,
      minOrderValue,
      usageLimit,
      createdBy: req.user._id
    });

    await campaign.save();
    res.status(201).json({ message: 'Campaign created', campaign });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create campaign' });
  }
});

module.exports = router;
// --- Onboarding: Vendor Leads Management ---
// Create or update a vendor lead (public registration handled on /api/vendor/register; admins can seed via this too)
router.post('/vendors/leads', protect, authorize('admin', 'global_admin', 'country_admin'), async (req, res) => {
  try {
    const lead = new VendorLead(req.body);
    await lead.save();
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ message: 'Invalid lead data', error: err.message });
  }
});

router.get('/vendors/leads', protect, authorize('admin', 'global_admin', 'country_admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const leads = await VendorLead.find(filter)
      .populate('assigned_to', 'name email')
      .sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch vendor leads' });
  }
});

router.put('/vendors/leads/:id', protect, authorize('admin', 'global_admin', 'country_admin'), async (req, res) => {
  try {
    const lead = await VendorLead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update lead', error: err.message });
  }
});

// Issue invite link (JWT) for a lead
router.post('/vendors/invite/:leadId', protect, authorize('admin', 'global_admin', 'country_admin'), async (req, res) => {
  try {
    const lead = await VendorLead.findById(req.params.leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    lead.status = 'invited';
    await lead.save();

    const expiresInDays = 7;
    const payload = { leadId: lead._id.toString(), email: lead.email, type: 'vendor-invite' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: `${expiresInDays}d` });
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    await InviteToken.create({ token, expiresAt, leadId: lead._id });

  const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vendor/onboard?token=${encodeURIComponent(token)}`;
    res.json({ message: 'Invite issued', inviteUrl, token, expiresAt });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create invite', error: err.message });
  }
});

// API-driven vendor verification (admin automation hook)
router.post('/vendors/verify', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    const { business_registry_id, tax_id, bank_details, vendor_id } = req.body;
    let user = null;
    if (vendor_id) {
      user = await User.findById(vendor_id);
    } else if (req.body.email) {
      user = await User.findOne({ email: req.body.email });
    }
    if (!user) return res.status(404).json({ message: 'Vendor not found' });
    user.vendorStatus = 'verified';
    user.trust_badge = true;
    if (business_registry_id) user.businessRegistryId = business_registry_id;
    if (tax_id) user.taxId = tax_id;
    if (bank_details) user.bankDetails = bank_details;
    await user.save();
    res.json({ status: 'verified', vendor_id: user._id.toString() });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed', error: err.message });
  }
});


