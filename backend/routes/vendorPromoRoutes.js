const express = require('express');
const router = express.Router();
const PromoCode = require('../models/PromoCode');
const PromoCampaign = require('../models/PromoCampaign');
const { protect, authorize } = require('../middleware/authMiddleware');

// ✅ GET: All promo codes created by the logged-in vendor
router.get('/', protect, authorize('vendor'), async (req, res) => {
  try {
    const promos = await PromoCode.find({ createdBy: req.user._id }).sort('-createdAt');
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch promo codes', error: err.message });
  }
});

// ✅ POST: Create a new promo code
router.post('/', protect, authorize('vendor'), async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minOrderValue,
      usageLimit,
      expiresAt,
      appliesToFirstTimeUsersOnly
    } = req.body;

    // Validation
    if (!code || !type || !value || !expiresAt) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newPromo = new PromoCode({
      code,
      type,
      value,
      minOrderValue,
      usageLimit,
      expiresAt,
      appliesToFirstTimeUsersOnly,
      createdBy: req.user._id
    });

    await newPromo.save();
    res.status(201).json({ message: 'Promo code created successfully', promo: newPromo });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create promo code', error: err.message });
  }
});

// ✅ DELETE: Remove a promo code
router.delete('/:id', protect, authorize('vendor'), async (req, res) => {
  try {
    const promo = await PromoCode.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!promo) return res.status(404).json({ message: 'Promo not found or unauthorized' });

    await promo.remove();
    res.json({ message: 'Promo code deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete promo code', error: err.message });
  }
});

// ✅ GET: Fetch all promo campaigns for a vendor
router.get('/campaigns', protect, authorize('vendor'), async (req, res) => {
  try {
    const campaigns = await PromoCampaign.find({ createdBy: req.user._id }).sort('-createdAt');
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch promo campaigns', error: err.message });
  }
});

// ✅ POST: Create a new promo campaign
router.post('/campaigns', protect, authorize('vendor'), async (req, res) => {
  try {
    const { name, description, promoCodes, startDate, endDate, status } = req.body;

    // Validation
    if (!name || !promoCodes || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newCampaign = new PromoCampaign({
      name,
      description,
      promoCodes,
      startDate,
      endDate,
      status: status || 'active',
      createdBy: req.user._id
    });

    await newCampaign.save();
    res.status(201).json({ message: 'Promo campaign created successfully', campaign: newCampaign });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create promo campaign', error: err.message });
  }
});

// ✅ PUT: Update a promo campaign
router.put('/campaigns/:id', protect, authorize('vendor'), async (req, res) => {
  try {
    const campaign = await PromoCampaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found or unauthorized' });

    const { name, description, promoCodes, startDate, endDate, status } = req.body;

    // Update the campaign with new values
    campaign.name = name || campaign.name;
    campaign.description = description || campaign.description;
    campaign.promoCodes = promoCodes || campaign.promoCodes;
    campaign.startDate = startDate || campaign.startDate;
    campaign.endDate = endDate || campaign.endDate;
    campaign.status = status || campaign.status;

    await campaign.save();
    res.json({ message: 'Promo campaign updated successfully', campaign });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update promo campaign', error: err.message });
  }
});

// ✅ DELETE: Remove a promo campaign
router.delete('/campaigns/:id', protect, authorize('vendor'), async (req, res) => {
  try {
    const campaign = await PromoCampaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found or unauthorized' });

    await campaign.remove();
    res.json({ message: 'Promo campaign deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete promo campaign', error: err.message });
  }
});

module.exports = router;
