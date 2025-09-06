const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envFiles = [
  path.resolve(__dirname, '.env.test.local'),
  path.resolve(__dirname, '.env.test')
];

let loadedAny = false;

envFiles.forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`✅ Loaded test environment from ${envPath}`);
    loadedAny = true;
  }
});

if (!loadedAny) {
  console.warn('⚠️ No .env.test or .env.test.local file found in backend directory.');
}

// Final safety: ensure mongoose is closed when Jest finishes the test run in this process
const maybeAddTeardown = () => {
  try {
    const mongoose = require('mongoose');
    if (mongoose && typeof afterAll === 'function') {
      afterAll(async () => {
        try {
          if (mongoose.connection && mongoose.connection.readyState !== 0) {
            await mongoose.connection.close(false);
          }
        } catch (_) {}
      });
    }
  } catch (_) {}
};

maybeAddTeardown();

// Ensure NODE_ENV is 'test' for server.js gating
if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test';
}
