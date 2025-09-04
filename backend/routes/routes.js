// File: routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// Storage configuration
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Upload product image (Vendor/Admin)
router.post('/', protect, authorize('vendor', 'admin'), upload.single('image'), (req, res) => {
  res.status(200).json({ imageUrl: `/uploads/${req.file.filename}` });
});

module.exports = router;