/* istanbul ignore file */
const path = require('path');
const Product = require('../models/Product');
const { generateDerivatives } = require('./imageDerivatives');

// Simple in-memory queue (per-process). Suitable for single-instance; can be swapped with Redis later.
const q = [];
let running = false;
let processed = 0;
let totalDurationMs = 0;

function depth() { return q.length + (running ? 1 : 0); }
function avgDurationMs() { return processed ? Math.round(totalDurationMs / processed) : 0; }

/**
 * Job shape: { productId, imageId, urlOriginal, cropPreset }
 */
function enqueue(job) {
  q.push(job);
  tick();
}

async function tick() {
  if (running) return;
  const job = q.shift();
  if (!job) return;
  running = true;
  const started = Date.now();
  try {
    const uploadsDirAbs = path.join(__dirname, '..', 'uploads');
    // job.urlOriginal is web path (/uploads/filename.ext). Convert to fs path
    const rel = String(job.urlOriginal || '').replace(/^\//, '');
    const fsPath = path.join(__dirname, '..', rel);
  const out = await generateDerivatives(fsPath, uploadsDirAbs, { cropPreset: job.cropPreset || 'original' });

    // Update product.gallery image entry
    const product = await Product.findById(job.productId);
    if (product && Array.isArray(product.gallery)) {
      const g = product.gallery.id(job.imageId) || product.gallery.find((x) => String(x.urlOriginal) === String(job.urlOriginal));
      if (g) {
        g.urlHero = out.hero?.url || g.urlHero || '';
        g.urlThumb = out.thumb?.url || g.urlThumb || '';
        g.widthOriginal = out.original?.width || g.widthOriginal || null;
        g.heightOriginal = out.original?.height || g.heightOriginal || null;
        g.widthHero = out.hero?.width || g.widthHero || null;
        g.heightHero = out.hero?.height || g.heightHero || null;
        g.widthThumb = out.thumb?.width || g.widthThumb || null;
        g.heightThumb = out.thumb?.height || g.heightThumb || null;
        g.mime = 'image/jpeg';
        await product.save();
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[derivativeQueue] Job failed', e.message);
  } finally {
    const dur = Date.now() - started;
    processed += 1;
    totalDurationMs += dur;
    running = false;
    // Next
    setImmediate(tick);
  }
}

function metrics() {
  return { depth: depth(), processed, avgDurationMs: avgDurationMs() };
}

module.exports = { enqueue, metrics };
