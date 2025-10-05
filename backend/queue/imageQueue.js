const EventEmitter = require('events');
const path = require('path');
const Product = require('../models/Product');
const { generateDerivatives } = require('../utils/imageDerivatives');

// Simple in-memory queue (single-process). For multi-instance, replace with Redis-backed queue.
const queue = [];
const bus = new EventEmitter();
let processing = false;

// Metrics
const metrics = {
  enqueued: 0,
  processed: 0,
  failed: 0,
  durations: [], // keep last 50
};

function recordDuration(ms) {
  metrics.durations.push(ms);
  if (metrics.durations.length > 50) metrics.durations.shift();
}

function getStats() {
  const n = metrics.durations.length;
  const avg = n ? metrics.durations.reduce((a, b) => a + b, 0) / n : 0;
  return {
    depth: queue.length + (processing ? 1 : 0),
    enqueued: metrics.enqueued,
    processed: metrics.processed,
    failed: metrics.failed,
    avgMs: Math.round(avg),
  };
}

function enqueue(job) {
  // job: { productId, imageId, urlOriginal, cropPreset }
  queue.push({ ...job, ts: Date.now() });
  metrics.enqueued += 1;
  bus.emit('poke');
}

async function processOne(job) {
  const start = Date.now();
  try {
    const product = await Product.findById(job.productId);
    if (!product) throw new Error('product not found');
    const img = product.gallery.id(job.imageId) || product.gallery.find(g => g.urlOriginal === job.urlOriginal);
    if (!img) throw new Error('image not found in product');

    // Map urlOriginal to absolute fs path under uploads
    const url = String(img.urlOriginal || job.urlOriginal || '');
    if (!/^\/?uploads\//i.test(url.replace(/^\//, ''))) {
      throw new Error('urlOriginal not under /uploads');
    }
    const uploadsDirAbs = path.join(__dirname, '..', 'uploads');
    const rel = url.replace(/^\//, '');
    const fsPath = path.join(__dirname, '..', rel);

    const out = await generateDerivatives(fsPath, uploadsDirAbs, job.cropPreset);
    if (!out) throw new Error('derivative generation returned empty');

    img.urlHero = out.hero?.url || img.urlHero || '';
    img.urlThumb = out.thumb?.url || img.urlThumb || '';
    img.widthOriginal = out.original?.width ?? img.widthOriginal ?? null;
    img.heightOriginal = out.original?.height ?? img.heightOriginal ?? null;
    img.widthHero = out.hero?.width ?? img.widthHero ?? null;
    img.heightHero = out.hero?.height ?? img.heightHero ?? null;
    img.widthThumb = out.thumb?.width ?? img.widthThumb ?? null;
    img.heightThumb = out.thumb?.height ?? img.heightThumb ?? null;
    if (job.cropPreset && !img.cropPreset) img.cropPreset = job.cropPreset;

    await product.save();
    metrics.processed += 1;
    recordDuration(Date.now() - start);
  } catch (e) {
    metrics.failed += 1;
    recordDuration(Date.now() - start);
    // eslint-disable-next-line no-console
    console.error('[imageQueue] Job failed', e.message);
  }
}

async function loop() {
  if (processing) return;
  processing = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      await processOne(job);
    }
  } finally {
    processing = false;
  }
}

bus.on('poke', () => {
  setImmediate(loop);
});

function init() {
  // No-op for now. Queue starts lazily on first enqueue.
}

module.exports = {
  init,
  enqueue,
  getStats,
};
