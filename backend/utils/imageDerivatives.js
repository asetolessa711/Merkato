/* istanbul ignore file */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Ensure derivatives directory exists under uploads
function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Generate hero and thumb derivatives for an uploaded image.
 * - Outputs JPEG as the canonical urlHero/urlThumb.
 * - Also writes AVIF and WebP siblings (not currently returned in schema).
 * Returns { hero: { url, width, height }, thumb: { url, width, height }, original: { width, height } }
 * Paths returned are web paths beginning with /uploads/...
 */
async function generateDerivatives(originalFsPath, uploadsDirAbs, opts = {}) {
  const heroMax = Number(process.env.IMG_HERO_MAX || 1200);
  const thumbMax = Number(process.env.IMG_THUMB_MAX || 192);
  const cropEnabled = String(process.env.IMG_CROP_ENABLED || 'false').toLowerCase() === 'true';
  const cropPreset = (opts.cropPreset || 'original');

  // Validate original exists
  const exists = fs.existsSync(originalFsPath);
  if (!exists) {
    throw new Error(`Original image not found: ${originalFsPath}`);
  }

  const relFromUploads = path.relative(uploadsDirAbs, originalFsPath); // e.g., 1700000-foo.jpg
  const baseName = path.basename(relFromUploads, path.extname(relFromUploads));
  const derivativesDir = path.join(uploadsDirAbs, 'derivatives');
  ensureDirSync(derivativesDir);

  // Output filenames
  const heroJpegFs = path.join(derivativesDir, `${baseName}-hero.jpg`);
  const heroWebpFs = path.join(derivativesDir, `${baseName}-hero.webp`);
  const heroAvifFs = path.join(derivativesDir, `${baseName}-hero.avif`);
  const thumbJpegFs = path.join(derivativesDir, `${baseName}-thumb.jpg`);
  const thumbWebpFs = path.join(derivativesDir, `${baseName}-thumb.webp`);
  const thumbAvifFs = path.join(derivativesDir, `${baseName}-thumb.avif`);

  const toWebPath = (fsPath) => `/uploads/${path.relative(uploadsDirAbs, fsPath).replace(/\\/g, '/')}`;

  // Read source metadata once
  const src = sharp(originalFsPath, { failOnError: false });
  const meta = await src.metadata();

  // HERO: either cover to crop preset or contain to heroMax
  let heroResize;
  if (cropEnabled && (cropPreset === '1:1' || cropPreset === '4:5')) {
    const target = { width: heroMax, height: cropPreset === '1:1' ? heroMax : Math.round(heroMax * 1.25), fit: 'cover', position: 'centre', withoutEnlargement: true };
    heroResize = target;
  } else {
    heroResize = {
      width: meta.width >= meta.height ? heroMax : undefined,
      height: meta.height > meta.width ? heroMax : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    };
  }
  const hero = sharp(originalFsPath, { failOnError: false }).resize(heroResize);
  // Avoid mozjpeg in tests/tiny fixtures to reduce "corrupt header" edge cases
  await hero.jpeg({ quality: 82 }).toFile(heroJpegFs);
  // Best-effort alt formats
  try { await hero.clone().webp({ quality: 80 }).toFile(heroWebpFs); } catch {}
  try { await hero.clone().avif({ quality: 50 }).toFile(heroAvifFs); } catch {}
  const heroMeta = await sharp(heroJpegFs).metadata();

  // THUMB: same crop logic
  let thumbResize;
  if (cropEnabled && (cropPreset === '1:1' || cropPreset === '4:5')) {
    thumbResize = { width: thumbMax, height: cropPreset === '1:1' ? thumbMax : Math.round(thumbMax * 1.25), fit: 'cover', position: 'centre', withoutEnlargement: true };
  } else {
    thumbResize = {
      width: meta.width >= meta.height ? thumbMax : undefined,
      height: meta.height > meta.width ? thumbMax : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    };
  }
  const thumb = sharp(originalFsPath, { failOnError: false }).resize(thumbResize);
  await thumb.jpeg({ quality: 80 }).toFile(thumbJpegFs);
  try { await thumb.clone().webp({ quality: 75 }).toFile(thumbWebpFs); } catch {}
  try { await thumb.clone().avif({ quality: 45 }).toFile(thumbAvifFs); } catch {}
  const thumbMeta = await sharp(thumbJpegFs).metadata();

  return {
    original: { width: meta.width || null, height: meta.height || null },
    hero: { url: toWebPath(heroJpegFs), width: heroMeta.width || null, height: heroMeta.height || null },
    thumb: { url: toWebPath(thumbJpegFs), width: thumbMeta.width || null, height: thumbMeta.height || null },
  };
}

/**
 * Ensure derivatives exist for a given original URL under /uploads.
 * Returns derivative info or null if flag disabled or not an uploads URL.
 */
async function ensureDerivativesForUploadUrl(urlOriginal, opts = {}) {
  const enabled = String(process.env.IMG_DERIVATIVES_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) return null;
  if (!urlOriginal || !/^\/?uploads\//i.test(urlOriginal.replace(/^\//, ''))) return null;
  const uploadsDirAbs = path.join(__dirname, '..', 'uploads');
  const rel = urlOriginal.replace(/^\//, '');
  const fsPath = path.join(__dirname, '..', rel);
  try {
    const out = await generateDerivatives(fsPath, uploadsDirAbs, opts);
    return out;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[imageDerivatives] Failed to generate derivatives for', urlOriginal, e.message);
    return null;
  }
}

module.exports = {
  generateDerivatives,
  ensureDerivativesForUploadUrl,
};
