// File: routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { moderateImage } = require('../utils/azureContentModerator');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    // Sanitize base name: remove path separators and dangerous chars
    let base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    // Prevent directory traversal by stripping any path
    if (base.includes('..') || base.includes('/') || base.includes('\\')) {
      base = 'file';
    }
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// File filter for videos (admin only)
const videoFileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only MP4 and WebM video files are allowed!'));
  }
};

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit for images
});

const uploadVideo = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for videos
});

// @route   POST /api/upload
// @desc    Upload product images (for vendor or admin) — now supports multiple files
// @access  Private
router.post('/', protect, authorize('vendor', 'admin'), (req, res, next) => {
  let aborted = false;
  req.on('aborted', () => {
    aborted = true;
    // eslint-disable-next-line no-console
    console.error('[uploadRoutes] Request aborted by client');
  });
  // Allow up to 5 images at once
  upload.array('images', 5)(req, res, async function (err) {
    if (aborted) {
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File too large' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const imageUrls = [];
    for (const file of req.files) {
      const imageUrl = `/uploads/${file.filename}`;
      const savedPath = path.join(uploadDir, file.filename);
      // Debug logging
      // eslint-disable-next-line no-console
      console.log(`[uploadRoutes] File uploaded:`, {
        originalname: file.originalname,
        filename: file.filename,
        savedPath,
        exists: fs.existsSync(savedPath)
      });
      // Azure Content Moderator integration
      try {
        const moderation = await moderateImage(savedPath);
        if (
          moderation.AdultClassificationScore > 0.5 ||
          moderation.IsImageAdultClassified ||
          moderation.RacyClassificationScore > 0.5 ||
          moderation.IsImageRacyClassified
        ) {
          // Delete the file
          fs.unlinkSync(savedPath);
          continue; // Skip this file
        }
      } catch (modErr) {
        // Delete the file if moderation fails
        if (fs.existsSync(savedPath)) fs.unlinkSync(savedPath);
        continue; // Skip this file
      }
      // Extra error handling: check file stream closed
      try {
        const fd = fs.openSync(savedPath, 'r');
        fs.closeSync(fd);
        imageUrls.push(imageUrl);
      } catch (openErr) {
        console.error('[uploadRoutes] File open error:', openErr);
        // File error, skip
      }
    }
    if (!aborted) {
      if (imageUrls.length === 0) {
        return res.status(400).json({ message: 'No valid images uploaded' });
      }
      res.status(200).json({ message: 'Product images uploaded successfully', imageUrls });
    }
  });
});


// @route   POST /api/upload/video
// @desc    Upload promotional video (admin only)
// @access  Private (admin)
router.post('/video', protect, authorize('admin'), (req, res, next) => {
  let aborted = false;
  req.on('aborted', () => {
    aborted = true;
    // eslint-disable-next-line no-console
    console.error('[uploadRoutes] Video upload request aborted by client');
  });
  uploadVideo.single('video')(req, res, function (err) {
    if (aborted) {
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Video file too large' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }
    const videoUrl = `/uploads/${req.file.filename}`;
    const savedPath = path.join(uploadDir, req.file.filename);
    // Debug logging
    // eslint-disable-next-line no-console
    console.log(`[uploadRoutes] Video uploaded:`, {
      originalname: req.file.originalname,
      filename: req.file.filename,
      savedPath,
      exists: fs.existsSync(savedPath)
    });
    fs.open(savedPath, 'r', (openErr, fd) => {
      if (openErr) {
        console.error('[uploadRoutes] Video file open error:', openErr);
        return res.status(500).json({ message: 'Video file save error' });
      }
      fs.close(fd, (closeErr) => {
        if (closeErr) {
          console.error('[uploadRoutes] Video file close error:', closeErr);
        }
        if (!aborted) {
          res.status(200).json({ message: 'Promotional video uploaded successfully', videoUrl });
        }
      });
    });
  });
});

module.exports = router;
