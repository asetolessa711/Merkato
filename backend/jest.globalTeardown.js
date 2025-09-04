// backend/jest.globalTeardown.js
// Closes MongoDB connections and any lingering servers after Jest runs.

module.exports = async () => {
  try {
    // Close mongoose if loaded
    try {
      const mongoose = require('mongoose');
      if (mongoose && mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        // Small delay to allow sockets to drain
        await new Promise((r) => setTimeout(r, 50));
        // eslint-disable-next-line no-console
        console.log('🛑 [jest.globalTeardown] Closed mongoose connection');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ [jest.globalTeardown] mongoose close skipped:', e.message);
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
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ [jest.globalTeardown] Error during teardown:', err);
  }
};
