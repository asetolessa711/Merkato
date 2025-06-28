// File: routes/vendorRoutes.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/authMiddleware');
const { Parser } = require('json2csv');

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
    const orders = await Order.find({ 'products.product': { $exists: true } })
      .populate('products.product')
      .populate('buyer', 'name email');

    let totalRevenue = 0;
    let totalItemsSold = 0;
    let orderCount = 0;
    const uniqueBuyers = new Set();

    orders.forEach(order => {
      const vendorItems = order.products.filter(p => {
        const vendor = p.product?.vendor;
        return vendor?.toString() === req.user._id.toString();
      });

      if (vendorItems.length > 0) {
        orderCount += 1;
        uniqueBuyers.add(order.buyer?._id?.toString());

        vendorItems.forEach(item => {
          totalRevenue += item.quantity * (item.product?.price || 0);
          totalItemsSold += item.quantity;
        });
      }
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
    const orders = await Order.find({ 'products.product': { $exists: true } })
      .populate('products.product');

    const productMap = {};

    orders.forEach(order => {
      order.products.forEach(p => {
        if (p.product?.vendor?.toString() === req.user._id.toString()) {
          const key = p.product._id;
          if (!productMap[key]) {
            productMap[key] = { name: p.product.name, quantity: 0 };
          }
          productMap[key].quantity += p.quantity;
        }
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
    const orders = await Order.find({ 'products.product': { $exists: true } })
      .populate('products.product')
      .populate('buyer');

    const customerMap = {};

    orders.forEach(order => {
      let totalForVendor = 0;
      order.products.forEach(p => {
        if (p.product?.vendor?.toString() === req.user._id.toString()) {
          totalForVendor += (p.quantity * (p.product.price || 0));
        }
      });

      if (totalForVendor > 0 && order.buyer) {
        const key = order.buyer._id;
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
    if (!vendor || vendor.role !== 'vendor') {
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
