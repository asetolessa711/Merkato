
// File: routes/vendorRoutes.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/authMiddleware');
const { Parser } = require('json2csv');

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
    const products = await Product.find({ vendor: req.user._id });
    const totalRevenue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);
    res.json({
      totalRevenue: totalRevenue.toFixed(2),
      productCount: products.length
    });
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
