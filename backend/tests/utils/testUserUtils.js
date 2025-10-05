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

  // Normalize roles: accept singular `role` or array `roles`
  let roles = Array.isArray(userFields.roles) && userFields.roles.length
    ? userFields.roles
    : ['customer'];
  if (!Array.isArray(userFields.roles) && typeof userFields.role === 'string' && userFields.role.trim()) {
    roles = [userFields.role.trim()];
  }

  const userData = {
    email: userFields.email || defaultEmail,
    password: userFields.password || 'Password123!',
    name: userFields.name || 'Test User',
    country: userFields.country || 'Ethiopia',
    roles,
    ...userFields
  };

  console.log('[registerTestUser] Attempting to register user:', userData.email, 'NODE_ENV=', process.env.NODE_ENV, 'JEST_WORKER_ID=', process.env.JEST_WORKER_ID);
  // Prefer direct model create for stability and to respect provided credentials
  console.log('[registerTestUser] Using direct model create path');
  const User = require('../../models/User');
  const tryDirectCreate = async (data) => {
    try {
      const doc = await User.create({
        name: data.name,
        email: data.email,
        password: data.password,
        roles: data.roles,
        country: data.country || 'Ethiopia'
      });
      console.log('[registerTestUser] Direct create success:', doc.email);
      // Attempt to login to get a token for routes protected by `protect`
      try {
        const { token } = await loginTestUser(data.email, data.password);
        return { _id: doc._id, email: doc.email, roles: doc.roles, name: doc.name, token };
      } catch (loginErr) {
        console.warn('[registerTestUser] Direct create login failed, returning without token:', loginErr && loginErr.message);
        return { _id: doc._id, email: doc.email, roles: doc.roles, name: doc.name };
      }
    } catch (e) {
      console.warn('[registerTestUser] Direct create failed:', {
        code: e && e.code,
        name: e && e.name,
        message: e && e.message,
        errors: e && e.errors ? Object.keys(e.errors) : undefined
      });
      throw e;
    }
  };

  // Try direct create up to 2 times with a fresh email on retry
  try {
    return await tryDirectCreate(userData);
  } catch (firstErr) {
    const retryEmail = `testuser_${uuidv4()}@example.com`;
    console.warn('[registerTestUser] Retrying direct create with a new email:', retryEmail);
    try {
      return await tryDirectCreate({ ...userData, email: retryEmail });
    } catch (secondErr) {
      console.warn('[registerTestUser] Second direct create failed, falling back to API register');
    }
  }

  // Fallback to API-based registration (normal register only)
  let lastErr;
  try {
    await new Promise((r) => setTimeout(r, 100)); // tiny backoff
    const res = await request(app).post(registerPath).send(userData);
    if (res.statusCode === 201 || res.statusCode === 200) {
      const payload = res.body || {};
      const email = payload.email || payload.user?.email || userData.email;
      const id = payload._id || payload.user?._id || payload.id;
      const token = payload.token || payload.accessToken;
      console.log('[registerTestUser] Fallback API create success:', email, 'via', registerPath);
      if (token) {
        return { _id: id, email, roles: userData.roles, name: userData.name, token };
      }
      // If API did not return token, try to login explicitly to get one
      try {
        const login = await loginTestUser(email, userData.password);
        return { _id: id, email, roles: userData.roles, name: userData.name, token: login.token };
      } catch (loginErr) {
        console.warn('[registerTestUser] API create ok but login failed:', loginErr && loginErr.message);
        return { _id: id, email, roles: userData.roles, name: userData.name };
      }
    }
    console.error('[registerTestUser] API register failed', res.statusCode, res.text);
    lastErr = new Error(`API register failed ${res.statusCode}: ${res.text}`);
  } catch (apiErr) {
    console.error('[registerTestUser] API register exception', apiErr && apiErr.message);
    lastErr = apiErr;
  }

  // Final salvage: attempt to upsert via model and login
  try {
    const existing = await User.findOne({ email: userData.email }).select('+password');
    if (existing) {
      existing.password = userData.password;
      existing.roles = userData.roles;
      existing.country = existing.country || userData.country || 'Ethiopia';
      await existing.save();
      console.log('[registerTestUser] Salvaged by updating existing user and setting password:', existing.email);
      try {
        const { token } = await loginTestUser(existing.email, userData.password);
        return { _id: existing._id, email: existing.email, roles: existing.roles, name: existing.name, token };
      } catch (e) {
        console.warn('[registerTestUser] Salvage login failed:', e && e.message);
        return { _id: existing._id, email: existing.email, roles: existing.roles, name: existing.name };
      }
    }
  } catch (salvageErr) {
    console.warn('[registerTestUser] Salvage via upsert failed:', salvageErr && salvageErr.message);
  }

  throw lastErr || new Error('Unknown registration failure');
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

  try {
    let req = request(app).delete(`${deletePath}/${userId}`);
    if (token) req = req.set(tokenHeader, `Bearer ${token}`);
    const res = await req;
    if ([200, 204].includes(res.statusCode)) {
      return true;
    }
    if (!silent) {
      console.warn(`⚠️ Failed to delete user ${userId} — ${res.statusCode}: ${res.text}`);
    }
  } catch (e) {
    if (!silent) console.warn(`⚠️ Delete request errored for ${userId}:`, e.message);
  }
  // Test fallback: directly delete from model
  try {
    const User = require('../../models/User');
    const r = await User.deleteOne({ _id: userId });
    if (r && (r.deletedCount > 0 || r.acknowledged)) {
      if (!silent) console.log(`[deleteTestUser] Direct model delete OK for ${userId}`);
      return true;
    }
  } catch (e2) {
    if (!silent) console.warn(`[deleteTestUser] Direct model delete failed for ${userId}:`, e2.message);
  }
  return false;
}

module.exports = {
  registerTestUser,
  loginTestUser,
  deleteTestUser
};
