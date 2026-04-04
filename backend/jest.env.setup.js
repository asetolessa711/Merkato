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

// Note: do not close mongoose in per-file afterAll hooks here.
// We rely on global teardown to avoid cross-suite disconnect races.

// Ensure NODE_ENV is 'test' for server.js gating
if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test';
}

// Provide safe defaults for email creds in test to prevent require-time throws.
// We still mock nodemailer later so no real email is sent.
if (!process.env.EMAIL_USER) {
  process.env.EMAIL_USER = 'test@example.com';
}
if (!process.env.EMAIL_PASS) {
  process.env.EMAIL_PASS = 'test-password';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_secret';
}

if (!process.env.STRIPE_SECRET_KEY) {
  process.env.STRIPE_SECRET_KEY = 'sk_test_merkato_local';
}

if (!process.env.STRIPE_PUBLISHABLE_KEY) {
  process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_merkato_local';
}

if (!process.env.CLIENT_URL) {
  process.env.CLIENT_URL = 'http://localhost:3000';
}

// Force canonical test DB URI to avoid accidental use of dev DB in shared environments.
process.env.MONGO_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/merkato_test';
