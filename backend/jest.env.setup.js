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

// Note: We intentionally avoid closing mongoose per test file here.
// Global teardown handles closing DB/socket handles once after all tests finish.

// Ensure NODE_ENV is 'test' for server.js gating
if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test';
}

// Enable relaxed product upload validation in tests to keep integration flows stable
if (!process.env.RELAX_UPLOAD_VALIDATION) {
  process.env.RELAX_UPLOAD_VALIDATION = 'true';
}

// Provide safe defaults for email creds in test to prevent require-time throws.
// We still mock nodemailer later so no real email is sent.
if (!process.env.EMAIL_USER) {
  process.env.EMAIL_USER = 'test@example.com';
}
if (!process.env.EMAIL_PASS) {
  process.env.EMAIL_PASS = 'test-password';
}

// Provide a default local Mongo URI for tests if missing, so server.js can start in CI
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/merkato_test';
}

// Ensure JWT secret exists in tests; registration/login depends on it
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-please-change';
}

// Derivatives: enable and use small sizes in tests for stability and speed
if (!process.env.IMG_DERIVATIVES_ENABLED) {
  process.env.IMG_DERIVATIVES_ENABLED = 'true';
}
if (!process.env.IMG_HERO_MAX) {
  process.env.IMG_HERO_MAX = '800';
}
if (!process.env.IMG_THUMB_MAX) {
  process.env.IMG_THUMB_MAX = '160';
}

// Keep derivatives queue disabled under tests for determinism
if (!process.env.IMG_DERIVATIVES_ASYNC) {
  process.env.IMG_DERIVATIVES_ASYNC = 'false';
}
