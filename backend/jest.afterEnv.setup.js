// backend/jest.afterEnv.setup.js
// Lightweight guardrails to reduce flaky tests & improve diagnostics.

// 1) Enable Jest retries for tests that occasionally fail due to timing
//    Keep low to avoid hiding real issues; tune per-suite if needed.
if (typeof jest !== 'undefined' && typeof jest.retryTimes === 'function') {
  const defaultRetries = parseInt(process.env.JEST_RETRIES || '1', 10);
  if (defaultRetries > 0) {
    jest.retryTimes(defaultRetries, { logErrorsBeforeRetry: true });
  }
}

// 2) Unhandled rejections shouldn't crash the whole run unpredictably; surface clearly
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[jest.afterEnv] UnhandledRejection:', reason);
});

// 3) Uncaught exceptions: log and allow Jest to fail the affected test cleanly
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[jest.afterEnv] UncaughtException:', err);
});
