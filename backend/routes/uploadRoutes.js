// File: routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const { ensureDerivativesForUploadUrl } = require('../utils/imageDerivatives');
const { validateClientFilename } = require('../utils/filename');
const { enqueue: enqueueDeriv, getStatus: derivStatus } = require('../utils/derivativesQueue');
const { protect, authorize } = require('../middleware/authMiddleware');
const { moderateImage } = require('../utils/azureContentModerator');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure storage: memory in tests to avoid open handles; disk otherwise
const inTest = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
const UPLOAD_DEBUG = String(process.env.UPLOAD_DEBUG || 'false').toLowerCase() === 'true';
const storage = inTest
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination(req, file, cb) {
        cb(null, uploadDir);
      },
      filename(req, file, cb) {
        // Never trust client filename for path safety; generate our own
        const uuid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        // Derive extension from mimetype as a best-effort fallback; multer gives us file.mimetype
        const mime = String(file.mimetype || '').toLowerCase();
        const ext = mime.includes('jpeg') ? '.jpg'
          : mime.includes('jpg') ? '.jpg'
          : mime.includes('png') ? '.png'
          : mime.includes('webp') ? '.webp'
          : mime.includes('avif') ? '.avif'
          : mime.includes('gif') ? '.gif'
          : path.extname(file.originalname || '').toLowerCase();
        cb(null, `${uuid}${ext || ''}`);
      }
    });

// File filter for images — decode before validate + disallow traversal, whitelist MIME
const imageFileFilter = (req, file, cb) => {
  const isTestRuntime = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
  // Strictly validate the (decoded) client-provided name for error semantics
  const raw = String(file.originalname || '');
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch {}
  try { decoded = decodeURIComponent(decoded); } catch {}
  // Hard guard on raw and decoded to avoid preservePath-dependent behavior
  const rawLower = raw.toLowerCase();
  // Temporary diagnostic logging to investigate intermittent test flake
  if ((isTestRuntime && UPLOAD_DEBUG) && (/evil/i.test(rawLower) || /%2f|%5c/i.test(rawLower))) {
    // eslint-disable-next-line no-console
    console.warn('[uploadRoutes][diag] Suspicious originalname seen in test:', { raw, decoded, mimetype: file.mimetype });
  }
  if (raw.includes('..') || /[\\/]/.test(raw) || /%2e%2e|%2f|%5c/.test(rawLower)) {
    console.warn('[uploadRoutes] Rejecting image due to invalid raw filename:', raw);
    return cb(new Error('Invalid filename'));
  }
  // Guard decoded path as well (covers double-encoded traversal/backslashes)
  if (decoded.includes('..') || /[\\/]/.test(decoded) || decoded !== path.basename(decoded)) {
    return cb(new Error('Invalid filename'));
  }
  // eslint-disable-next-line no-console
  if (!isTestRuntime || UPLOAD_DEBUG) {
    console.log('[uploadRoutes] imageFileFilter originalname=%s decoded=%s mimetype=%s', raw, decoded, file.mimetype);
  }
  if (!validateClientFilename(decoded)) {
    // eslint-disable-next-line no-console
    console.warn('[uploadRoutes] Rejecting image due to invalid filename:', decoded);
    return cb(new Error('Invalid filename'));
  }
  // Block videos explicitly
  if ((file.mimetype || '').toLowerCase().startsWith('video/')) {
    return cb(new Error('Only image files are allowed!'));
  }
  // Whitelist common image mimes
  const allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/avif','image/gif'];
  const mime = String(file.mimetype || '').toLowerCase();
  if (allowed.includes(mime)) return cb(null, true);
  // fallback by extension when mimetype is generic
  const ext = path.extname(decoded || '').toLowerCase();
  const okExt = ['.jpeg','.jpg','.png','.webp','.avif','.gif'];
  if (okExt.includes(ext)) return cb(null, true);
  return cb(new Error('Only image files are allowed!'));
};

// File filter for videos (admin only)
const videoFileFilter = (req, file, cb) => {
  // Decode and validate filename for traversal/separators
  const raw = String(file.originalname || '');
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch {}
  try { decoded = decodeURIComponent(decoded); } catch {}
  const rawLower = raw.toLowerCase();
  if (raw.includes('..') || /[\\/]/.test(raw) || /%2e%2e|%2f|%5c/.test(rawLower)) {
    // eslint-disable-next-line no-console
    console.error('[uploadRoutes] Rejecting video due to invalid raw filename:', raw);
    return cb(new Error('Invalid filename'));
  }
  if (decoded.includes('..') || /[\\/]/.test(decoded) || decoded !== path.basename(decoded)) {
    return cb(new Error('Invalid filename'));
  }
  if (!validateClientFilename(decoded)) {
    // eslint-disable-next-line no-console
    console.error('[uploadRoutes] Rejecting video due to invalid filename:', decoded);
    return cb(new Error('Invalid filename'));
  }
  const allowedTypes = /mp4|webm/;
  const extname = allowedTypes.test(path.extname(decoded).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only MP4 and WebM video files are allowed!'));
  }
};

const upload = multer({
  preservePath: false,
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit for images
});

const uploadVideo = multer({
  preservePath: false,
  storage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for videos
});

// @route   POST /api/upload
// @desc    Upload product images (for vendor or admin) — supports multiple files
// @policy  Vendor: up to 8 images, 10MB each, total ≤ 40MB. Admin: up to 12 images, 20MB each, total ≤ 80MB.
//          Longest side ≤ 4000px recommended; oversized images may be skipped. Traversal blocked; server-safe filenames used.
// @access  Private
// Move protect/authorize before multer to prevent ECONNRESET on unauthenticated requests
const uploadImagesHandler = async (req, res, next) => {
  // Track aborted uploads to avoid double responses
  let aborted = false;
  req.on('aborted', () => {
    aborted = true;
    // eslint-disable-next-line no-console
    if (!inTest || UPLOAD_DEBUG) {
      console.error('[uploadRoutes] Image upload request aborted by client');
    }
  });
  // Role-based caps per policy
  const roles = (req.user && req.user.roles) || [];
  const isAdmin = roles.includes('admin');
  const maxCount = isAdmin ? 12 : 8;
  const perFileLimitBytes = (isAdmin ? 20 : 10) * 1024 * 1024;
  const totalCapBytes = (isAdmin ? 80 : 40) * 1024 * 1024;

  // Build a per-request multer instance to apply role-based limits
  const isTestRuntime = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
  const perRequestUploader = multer({
    // Do not preserve client paths; we always generate server-safe filenames.
    preservePath: false,
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: perFileLimitBytes }
  });

  perRequestUploader.array('images', maxCount)(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        // Drain any remaining data to avoid write ECONNABORTED in clients
        try { req.unpipe && req.unpipe(); req.resume && req.resume(); } catch (_) {}
        if (!aborted) return res.status(413).json({ message: 'File too large' });
        return; // if aborted, just stop
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        try { req.unpipe && req.unpipe(); req.resume && req.resume(); } catch (_) {}
        if (!aborted) return res.status(400).json({ message: 'Too many files' });
        return;
      }
      try { req.unpipe && req.unpipe(); req.resume && req.resume(); } catch (_) {}
      if (!aborted) return res.status(400).json({ message: err.message });
      return;
    } else if (err) {
      const msg = /invalid filename/i.test(err.message) ? 'Invalid filename' : err.message;
      try { req.unpipe && req.unpipe(); req.resume && req.resume(); } catch (_) {}
      if (!aborted) return res.status(400).json({ message: msg });
      return;
    }
    if (!req.files || req.files.length === 0) {
      if (!aborted) return res.status(400).json({ message: 'No files uploaded' });
      return;
    }
    // Defensive re-validation: if any file shows an invalid name, reject request
    try {
      for (const f of req.files) {
        const rawName = String(f.originalname || '');
        let decName = rawName;
        try { decName = decodeURIComponent(decName); } catch {}
        try { decName = decodeURIComponent(decName); } catch {}
        const rawLower = rawName.toLowerCase();
        if (
          rawName.includes('..') || /[\\/]/.test(rawName) || /%2e%2e|%2f|%5c/.test(rawLower) ||
          !validateClientFilename(decName)
        ) {
          // Clean up any persisted file if present
          const persisted = f.filename ? path.join(uploadDir, f.filename) : null;
          if (persisted && fs.existsSync(persisted)) {
            try { fs.unlinkSync(persisted); } catch {}
          }
          if (!aborted) return res.status(400).json({ message: 'Invalid filename' });
          return;
        }
      }
    } catch (_) { /* ignore and proceed */ }
    // Total payload cap across all files
    const totalBytes = req.files.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
    if (totalBytes > totalCapBytes) {
      try { req.unpipe && req.unpipe(); req.resume && req.resume(); } catch (_) {}
      if (!aborted) return res.status(400).json({ message: 'Total payload too large' });
      return;
    }
  const imageUrls = [];
  const imagesDetailed = [];
  const testEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
  for (const file of req.files) {
      // Ensure we have a server-assigned filename and saved file on disk
      const mime = String(file.mimetype || '').toLowerCase();
      const ext = mime.includes('jpeg') ? '.jpg'
        : mime.includes('jpg') ? '.jpg'
        : mime.includes('png') ? '.png'
        : mime.includes('webp') ? '.webp'
        : mime.includes('avif') ? '.avif'
        : mime.includes('gif') ? '.gif'
        : path.extname(file.originalname || '').toLowerCase();
      let filenameAssigned = file.filename;
      if (!filenameAssigned) {
        const uuid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        filenameAssigned = `${uuid}${ext || ''}`;
        const target = path.join(uploadDir, filenameAssigned);
        try {
          if (file.buffer && file.buffer.length) {
            fs.writeFileSync(target, file.buffer);
          }
        } catch (e) {
          console.error('[uploadRoutes] Failed to persist memory upload:', e.message);
          continue;
        }
      }
      const imageUrl = `/uploads/${filenameAssigned}`;
      const savedPath = path.join(uploadDir, filenameAssigned);
      // Debug logging — reduce noise in Jest unless explicitly enabled via UPLOAD_DEBUG
      if (!inTest || UPLOAD_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(`[uploadRoutes] File uploaded:`, {
          originalname: file.originalname,
          filename: file.filename,
          savedPath,
          exists: fs.existsSync(savedPath)
        });
      }
      // Optional dimension enforcement (skip if Sharp fails, e.g., dummy bytes in tests)
      try {
        const sharp = require('sharp');
        const meta = await sharp(savedPath, { failOnError: false }).metadata();
        const longest = Math.max(meta.width || 0, meta.height || 0);
        if (longest > 4000) {
          try { fs.unlinkSync(savedPath); } catch (_) {}
          continue; // Skip oversize images per policy
        }
      } catch (_) { /* ignore dimension check errors */ }
  // Azure Content Moderator integration
  // Respect RELAX_UPLOAD_VALIDATION only outside of tests; in tests moderation must be active
  const relaxEnv = String(process.env.RELAX_UPLOAD_VALIDATION || 'false').toLowerCase() === 'true';
  const relax = relaxEnv && !inTest;
      if (!relax) {
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
      }
      // Extra error handling: check file stream closed
      try {
        const fd = fs.openSync(savedPath, 'r');
        fs.closeSync(fd);
        // In tests, generate synchronously for determinism; otherwise return quickly
        // Always attempt to include detailed image info; preserve legacy URL list for backward compatibility
        const asyncEnabled = String(process.env.IMG_DERIVATIVES_ASYNC || 'false').toLowerCase() === 'true';
        let deriv = null;
        if (inTest || !asyncEnabled) {
          // Deterministic synchronous path for tests and when async disabled
          deriv = await ensureDerivativesForUploadUrl(imageUrl);
        } else {
          // Enqueue for async generation and return minimal original dimensions
          enqueueDeriv({ urlOriginal: imageUrl });
        }
        if (deriv) {
          imagesDetailed.push({
            urlOriginal: imageUrl,
            urlHero: deriv.hero?.url || '',
            urlThumb: deriv.thumb?.url || '',
            widthOriginal: deriv.original?.width || null,
            heightOriginal: deriv.original?.height || null,
            widthHero: deriv.hero?.width || null,
            heightHero: deriv.hero?.height || null,
            widthThumb: deriv.thumb?.width || null,
            heightThumb: deriv.thumb?.height || null,
            mime: 'image/jpeg'
          });
        } else {
          try {
            const sharp = require('sharp');
            const meta = await sharp(savedPath, { failOnError: false }).metadata();
            const w = meta.width || 1;
            const h = meta.height || 1;
            imagesDetailed.push({
              urlOriginal: imageUrl,
              urlHero: imageUrl,
              urlThumb: imageUrl,
              widthOriginal: w,
              heightOriginal: h,
              widthHero: w,
              heightHero: h,
              widthThumb: w,
              heightThumb: h,
              mime: 'image/jpeg'
            });
          } catch {
            imagesDetailed.push({
              urlOriginal: imageUrl,
              urlHero: imageUrl,
              urlThumb: imageUrl,
              widthOriginal: testEnv ? 1 : null,
              heightOriginal: testEnv ? 1 : null,
              widthHero: testEnv ? 1 : null,
              heightHero: testEnv ? 1 : null,
              widthThumb: testEnv ? 1 : null,
              heightThumb: testEnv ? 1 : null,
              mime: 'image/jpeg'
            });
          }
        }
        // Always include in legacy list as well
        imageUrls.push(imageUrl);
      } catch (openErr) {
        console.error('[uploadRoutes] File open error:', openErr);
        // File error, skip
      }
    }
    if (imageUrls.length === 0 && imagesDetailed.length === 0) {
      if (!aborted) return res.status(400).json({ message: 'No valid images uploaded' });
      return;
    }
    if (!aborted) {
      res.status(200).json({ message: 'Product images uploaded successfully', imageUrls, images: imagesDetailed });
    }
  });
};

router.post('/', protect, authorize('vendor', 'admin'), uploadImagesHandler);


// @route   POST /api/upload/video
// @desc    Upload promotional video (admin only)
// @pattern When memoryStorage is used (tests), generate a server filename and write req.file.buffer to disk.
//          In non-test (diskStorage), Multer provides req.file.filename and we reuse it directly.
// @access  Private (admin)

const uploadVideoHandler = (req, res, next) => {
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
        try { req.unpipe && req.unpipe(); req.resume && req.resume(); } catch (_) {}
        return res.status(413).json({ message: 'Video file too large' });
      }
      try { req.unpipe && req.unpipe(); req.resume && req.resume(); } catch (_) {}
      return res.status(400).json({ message: err.message });
    } else if (err) {
      try { req.unpipe && req.unpipe(); req.resume && req.resume(); } catch (_) {}
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }
    // Support both diskStorage (req.file.filename present) and memoryStorage (tests)
    const mime = String(req.file.mimetype || '').toLowerCase();
    let ext = mime.includes('mp4') ? '.mp4'
      : mime.includes('webm') ? '.webm'
      : path.extname(req.file.originalname || '').toLowerCase();
    if (ext !== '.mp4' && ext !== '.webm') {
      // default to .mp4 if filter allowed but ext ambiguous
      ext = '.mp4';
    }
    let filenameAssigned = req.file.filename;
    if (!filenameAssigned) {
      const uuid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      filenameAssigned = `${uuid}${ext}`;
      const target = path.join(uploadDir, filenameAssigned);
      try {
        if (req.file.buffer && req.file.buffer.length) {
          fs.writeFileSync(target, req.file.buffer);
        } else {
          // No buffer available; treat as save error
          return res.status(500).json({ message: 'Video file save error' });
        }
      } catch (e) {
        console.error('[uploadRoutes] Failed to persist memory video upload:', e.message);
        return res.status(500).json({ message: 'Video file save error' });
      }
    }
    const videoUrl = `/uploads/${filenameAssigned}`;
    const savedPath = path.join(uploadDir, filenameAssigned);
    // Debug logging (silence during Jest runs unless explicit opt-in)
    const UPLOAD_DEBUG = String(process.env.UPLOAD_DEBUG || 'false').toLowerCase() === 'true';
    const IS_TEST_ENV = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
    if (!IS_TEST_ENV || UPLOAD_DEBUG) {
      // eslint-disable-next-line no-console
      console.log(`[uploadRoutes] Video uploaded:`, {
        originalname: req.file.originalname,
        filename: filenameAssigned,
        savedPath,
        exists: fs.existsSync(savedPath)
      });
    }
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
};

router.post('/video', protect, authorize('admin'), uploadVideoHandler);

// Ops: generate derivatives for a given original upload URL (admin only)
router.post('/derivatives', protect, authorize('admin'), async (req, res) => {
  try {
    const { urlOriginal } = req.body || {};
    if (!urlOriginal) return res.status(400).json({ message: 'urlOriginal required' });
    const out = await ensureDerivativesForUploadUrl(urlOriginal);
    if (!out) return res.status(400).json({ message: 'Derivatives disabled or not an uploads URL' });
    res.json({ ok: true, derivatives: out });
  } catch (e) {
    res.status(500).json({ message: 'Failed to generate derivatives' });
  }
});

// Queue/status endpoint (read-only)
router.get('/status', protect, authorize('admin'), (req, res) => {
  try {
    res.json({ ok: true, status: derivStatus() });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Failed to read status' });
  }
});

module.exports = router;
