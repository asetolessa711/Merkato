const path = require('path');
const { ensureDerivativesForUploadUrl } = require('./imageDerivatives');

// Lightweight in-process queue for generating derivatives asynchronously.
// No background timers or intervals unless jobs are present.
// Metrics are kept in-memory; safe to use in single-process server.

const state = {
  enabled: String(process.env.IMG_DERIVATIVES_ASYNC || 'false').toLowerCase() === 'true' && !(process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test'),
  running: false,
  queue: [],
  totalProcessed: 0,
  totalFailed: 0,
  lastJobMs: 0,
};

function getStatus() {
  return {
    enabled: state.enabled,
    running: state.running,
    queueDepth: state.queue.length,
    totalProcessed: state.totalProcessed,
    totalFailed: state.totalFailed,
    lastJobMs: state.lastJobMs,
  };
}

function maybeRun() {
  if (!state.enabled) return;
  if (state.running) return;
  const next = state.queue.shift();
  if (!next) return;
  state.running = true;
  const started = Date.now();
  ensureDerivativesForUploadUrl(next.urlOriginal, { cropPreset: next.cropPreset })
    .then(() => {
      state.totalProcessed += 1;
    })
    .catch(() => {
      state.totalFailed += 1;
    })
    .finally(() => {
      state.lastJobMs = Date.now() - started;
      state.running = false;
      // Process next without retaining open timers
      // Yield to event loop to avoid deep recursion
      setImmediate(maybeRun);
    });
}

function enqueue(job) {
  if (!state.enabled) return { accepted: false, reason: 'Queue disabled' };
  if (!job || !job.urlOriginal || !/^\/uploads\//.test(job.urlOriginal)) {
    return { accepted: false, reason: 'Invalid job' };
  }
  state.queue.push({ urlOriginal: job.urlOriginal, cropPreset: job.cropPreset || 'original' });
  // Try to run immediately
  setImmediate(maybeRun);
  return { accepted: true };
}

function setEnabled(val) {
  state.enabled = !!val;
}

function drain() {
  // Clear queue; used primarily in tests/teardown if needed
  state.queue.length = 0;
}

module.exports = {
  enqueue,
  getStatus,
  setEnabled,
  drain,
};
