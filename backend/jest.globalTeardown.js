// backend/jest.globalTeardown.js
// Closes MongoDB connections and any lingering servers after Jest runs.

function summarizeHandle(h) {
  try {
    const type = (h && h.constructor && h.constructor.name) || typeof h;
    const details = { type };
    // Timers
    if (type === 'Timeout' || type === 'Immediate' || type === 'Timer') {
      details.hasRef = typeof h.hasRef === 'function' ? h.hasRef() : undefined;
      details._idleTimeout = h._idleTimeout;
      details._destroyed = h._destroyed;
      details._repeat = h._repeat;
    }
    // Sockets/Servers
    if (typeof h.address === 'function') {
      try {
        const addr = h.address();
        if (addr) details.address = addr;
      } catch (_) {}
    }
    if (h && h.remoteAddress) {
      details.remoteAddress = `${h.remoteAddress}:${h.remotePort}`;
    }
    if (h && h.localAddress) {
      details.localAddress = `${h.localAddress}:${h.localPort}`;
    }
    // Streams
    if (h && h.path) details.path = h.path;
    if (h && typeof h.pid === 'number') details.pid = h.pid;
    return details;
  } catch (_) {
    return { type: 'unknown' };
  }
}

module.exports = async () => {
  try {
    // Close mongoose if loaded
    try {
      const mongoose = require('mongoose');
      if (mongoose && mongoose.connection && mongoose.connection.readyState !== 0) {
        // Graceful close of the current connection
        await mongoose.connection.close(false);
        // Also ensure driver-level disconnect for good measure (Windows CI stability)
        try { await mongoose.disconnect(); } catch(_) {}
        // Remove any connection listeners that could keep the loop alive
        try { mongoose.connection.removeAllListeners && mongoose.connection.removeAllListeners(); } catch(_) {}
        // Small delay to allow sockets to drain fully
        await new Promise((r) => setTimeout(r, 75));
        // eslint-disable-next-line no-console
        console.log('🛑 [jest.globalTeardown] Closed mongoose connection');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ [jest.globalTeardown] mongoose close skipped:', e.message);
    }

    // Ensure any spawned test task processes are terminated (taskRunner)
    try {
      const taskRunner = require('./utils/taskRunner');
      if (taskRunner && typeof taskRunner._shutdownAllTasks === 'function') {
        taskRunner._shutdownAllTasks();
        // eslint-disable-next-line no-console
        console.log('🛑 [jest.globalTeardown] taskRunner tasks shutdown');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ [jest.globalTeardown] taskRunner shutdown skipped:', e.message);
    }

    // Close any servers exported to global if your tests set them
    if (global.__HTTP_SERVER__) {
      await new Promise((resolve) => {
        try {
          global.__HTTP_SERVER__.close(() => resolve());
        } catch (_) {
          resolve();
        }
      });
      // eslint-disable-next-line no-console
      console.log('🛑 [jest.globalTeardown] Closed HTTP server');
    }

    // Optional: Log any active handles/requests after teardown for diagnostics
    if (process.env.JEST_LOG_HANDLES === 'true' && typeof process._getActiveHandles === 'function') {
      // Give event loop a microtick to settle any close callbacks
      await new Promise((r) => setTimeout(r, 25));
      try {
        const handles = process._getActiveHandles();
        // eslint-disable-next-line no-console
        console.log('🧵 [jest.globalTeardown] Active handles count:', handles.length);
        handles.forEach((h, i) => {
          // eslint-disable-next-line no-console
          console.log(`🧵 handle[${i}]`, summarizeHandle(h));
        });
        if (typeof process._getActiveRequests === 'function') {
          const requests = process._getActiveRequests();
          // eslint-disable-next-line no-console
          console.log('📨 [jest.globalTeardown] Active requests count:', requests.length);
          requests.forEach((r, i) => {
            const type = (r && r.constructor && r.constructor.name) || typeof r;
            // eslint-disable-next-line no-console
            console.log(`📨 request[${i}]`, { type });
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('⚠️ [jest.globalTeardown] Could not enumerate active handles:', e.message);
      }
    }

    // As a last resort for flaky Windows environments, honor JEST_FORCE_EXIT
    if (process.env.JEST_FORCE_EXIT === 'true') {
      // eslint-disable-next-line no-console
      console.log('⚠️ [jest.globalTeardown] Forcing process.exit due to JEST_FORCE_EXIT=true');
      // Give streams a tick to flush
      await new Promise((r) => setTimeout(r, 25));
      process.exit(0);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ [jest.globalTeardown] Error during teardown:', err);
  }
};
