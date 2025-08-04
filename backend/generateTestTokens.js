// generateTestTokens.js

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.test for JWT_SECRET
const envPath = path.resolve(__dirname, '.env.test');
dotenv.config({ path: envPath });

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_merkato';

// Example user payloads (adjust IDs/emails as needed)
const adminPayload = {
  _id: '000000000000000000000001',
  email: 'admin@test.com',
  roles: ['admin'],
};
const userPayload = {
  _id: '000000000000000000000002',
  email: 'customer@test.com',
  roles: ['customer'], // PATCHED: was 'user', now 'customer'
};
const vendorPayload = {
  _id: '000000000000000000000003',
  email: 'vendor@test.com',
  roles: ['vendor'],
};

const options = { expiresIn: '7d' };

const adminToken = jwt.sign(adminPayload, JWT_SECRET, options);
const userToken = jwt.sign(userPayload, JWT_SECRET, options);
const vendorToken = jwt.sign(vendorPayload, JWT_SECRET, options);

console.log('TEST_ADMIN_TOKEN=Bearer ' + adminToken);
console.log('TEST_USER_TOKEN=Bearer ' + userToken);
console.log('TEST_VENDOR_TOKEN=Bearer ' + vendorToken);
