import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

let mock = null;

/**
 * Setup mock adapter with optional default routes.
 * Each default: { method, url, status, response }
 */
export function setupMockAxios(defaults = []) {
  mock = new MockAdapter(axios, { delayResponse: 300 });

  defaults.forEach(({ method = 'get', url, status = 200, response }) => {
    if (mock[`on${method.charAt(0).toUpperCase() + method.slice(1)}`]) {
      mock[`on${method.charAt(0).toUpperCase() + method.slice(1)}`](url).reply(status, response);
    }
  });

  return mock;
}

/**
 * Mock a successful user fetch with a given role.
 */
export function mockUser(role = 'customer', name = 'Test User') {
  if (mock) {
    let rolesArr = [];
    if (role === 'customer') rolesArr = ['customer'];
    else if (role === 'vendor') rolesArr = ['vendor'];
    else if (role === 'admin') rolesArr = ['admin'];
    else rolesArr = [role];
    mock.onGet(/\/api\/auth\/me/).reply(200, {
      user: {
        role,
        roles: rolesArr,
        email: 'test@example.com',
        name
      }
    });
    // Add required API mocks for dashboard
    mock.onGet(/\/api\/favorites/).reply(200, []);
    mock.onGet(/\/api\/orders\/recent/).reply(200, []);
    mock.onGet(/\/api\/customer\/profile/).reply(200, { user: { name, email: 'test@example.com' } });
  }
}

/**
 * Mock a failed user fetch (e.g., auth error).
 */
export function mockUserAuthError() {
  if (mock) {
    mock.onGet(/\/api\/auth\/me/).reply(401, { error: 'Auth error' });
  }
}

/**
 * Clear all mock routes.
 */
export function resetMockAxios() {
  if (mock) mock.reset();
}

/**
 * Restore original axios instance.
 */
export function restoreMockAxios() {
  if (mock) {
    mock.restore();
    mock = null;
  }
}

/**
 * Get the current mock instance.
 */
export function getMockAxios() {
  return mock;
}