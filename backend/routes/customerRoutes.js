// File: routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// ✅ Update customer profile (avatar)
router.put('/profile', protect, authorize('customer'), async (req, res) => {
  try {
    const customer = await User.findById(req.user._id);
    if (!customer || !customer.roles.includes('customer')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    customer.avatar = req.body.avatar || customer.avatar;
    await customer.save();

    res.json({
      message: 'Customer profile updated successfully',
      avatar: customer.avatar
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
});


// ==========================
// ✅ SAVED ADDRESSES ROUTES
// ==========================

// GET all saved addresses
router.get('/addresses', protect, authorize('customer'), async (req, res) => {
  const customer = await User.findById(req.user._id);
  res.json(customer.savedAddresses || []);
});

// POST a new address
router.post('/addresses', protect, authorize('customer'), async (req, res) => {
  const customer = await User.findById(req.user._id);
  const newAddress = req.body;

  if (newAddress.isDefault) {
    customer.savedAddresses.forEach(a => a.isDefault = false); // unset others
  }

  customer.savedAddresses.push(newAddress);
  await customer.save();
  res.json(customer.savedAddresses);
});

// PUT update an address by ID
router.put('/addresses/:id', protect, authorize('customer'), async (req, res) => {
  const customer = await User.findById(req.user._id);
  const index = customer.savedAddresses.findIndex(a => a._id.toString() === req.params.id);

  if (index === -1) return res.status(404).json({ message: 'Address not found' });

  if (req.body.isDefault) {
    customer.savedAddresses.forEach(a => a.isDefault = false);
  }

  customer.savedAddresses[index] = { ...customer.savedAddresses[index]._doc, ...req.body };
  await customer.save();
  res.json(customer.savedAddresses);
});

// DELETE an address by ID
router.delete('/addresses/:id', protect, authorize('customer'), async (req, res) => {
  const customer = await User.findById(req.user._id);
  customer.savedAddresses = customer.savedAddresses.filter(a => a._id.toString() !== req.params.id);
  await customer.save();
  res.json(customer.savedAddresses);
});

// PUT set one address as default
router.put('/addresses/default/:id', protect, authorize('customer'), async (req, res) => {
  const customer = await User.findById(req.user._id);
  customer.savedAddresses.forEach(address => {
    address.isDefault = address._id.toString() === req.params.id;
  });
  await customer.save();
  res.json(customer.savedAddresses);
});

module.exports = router;
