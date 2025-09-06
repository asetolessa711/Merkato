const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const app = require('../../server');

/**
 * Registers a new test user via API.
 * @param {Object} userFields - User fields (email, password, name, etc.)
 * @param {Object} [options]
 * @param {string} [options.registerPath='/api/auth/register']
 * @returns {Promise<Object>} Created user data (may include token or user ID).
 */
async function registerTestUser(userFields = {}, { registerPath = '/api/auth/register' } = {}) {
  const uniqueSuffix = uuidv4();
  const defaultEmail = `testuser_${uniqueSuffix}@example.com`;

  const userData = {
    email: userFields.email || defaultEmail,
    password: userFields.password || 'Password123!',
    name: userFields.name || 'Test User',
    country: userFields.country || 'Ethiopia',
    ...userFields
  };

  console.log('[registerTestUser] Attempting to register user:', userData.email);
  try {
    const res = await request(app).post(registerPath).send(userData);
    if (![200, 201].includes(res.statusCode)) {
      console.error('[registerTestUser] Registration failed:', res.statusCode, res.text);
      throw new Error(`❌ Failed to register user (${res.statusCode}): ${res.text}`);
    }
    console.log('[registerTestUser] Registration success:', userData.email);
    return res.body;
  } catch (err) {
    console.error('[registerTestUser] Exception:', err);
    throw err;
  }
}

/**
 * Logs in a test user via API and returns token and user info.
 * @param {string} email
 * @param {string} password
 * @param {Object} [options]
 * @param {string} [options.loginPath='/api/auth/login']
 * @param {Object} [options.extraFields] - Extra fields (e.g., OTP)
 * @returns {Promise<{token: string, user: Object}>}
 */
async function loginTestUser(
  email,
  password,
  { loginPath = '/api/auth/login', extraFields = {} } = {}
) {
  if (!email || !password) {
    throw new Error('Email and password are required to login a test user.');
  }

  console.log('[loginTestUser] Attempting login for:', email);
  try {
    const res = await request(app)
      .post(loginPath)
      .send({ email, password, ...extraFields });

    if (res.statusCode !== 200) {
      console.error('[loginTestUser] Login failed:', res.statusCode, res.text);
      throw new Error(`❌ Failed to login (${res.statusCode}): ${res.text}`);
    }

    const token = res.body.token || res.body.accessToken;
    const user = res.body.user || res.body;
    console.log('[loginTestUser] Login success:', email);
    return { token, user };
  } catch (err) {
    console.error('[loginTestUser] Exception:', err);
    throw err;
  }
}

/**
 * Deletes a test user via API.
 * @param {string} userId
 * @param {string} [token] - Bearer token
 * @param {Object} [options]
 * @param {string} [options.deletePath='/api/users']
 * @param {boolean} [options.silent=false]
 * @param {string} [options.tokenHeader='Authorization']
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteTestUser(
  userId,
  token,
  { deletePath = '/api/users', silent = false, tokenHeader = 'Authorization' } = {}
) {
  if (!userId) return false;

  let req = request(app).delete(`${deletePath}/${userId}`);
  if (token) req = req.set(tokenHeader, `Bearer ${token}`);

  const res = await req;

  if (![200, 204].includes(res.statusCode)) {
    if (!silent) {
      console.warn(`⚠️ Failed to delete user ${userId} — ${res.statusCode}: ${res.text}`);
    }
    return false;
  }

  return true;
}

module.exports = {
  registerTestUser,
  loginTestUser,
  deleteTestUser
};
