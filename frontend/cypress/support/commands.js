import 'cypress-file-upload';

const API_URL = Cypress.env('API_URL') || 'http://localhost:5051';

// Ensure dev/test seed exists (idempotent)
Cypress.Commands.add('ensureSeed', () => {
  return cy.request({
    method: 'POST',
    url: `${API_URL}/api/dev/seed`,
    failOnStatusCode: false
  });
});

// Custom command to seed orders for tests
// Accepts an optional payload (ignored by backend route, but kept for API-compat)
Cypress.Commands.add('seedOrders', (payload) => {
  // Use token from localStorage to authorize the test seed endpoint
  cy.window().then((win) => {
    const token = win.localStorage.getItem('token');
    // Persist payload for UI-level injection as a fallback (AdminOrders reads e2e-orders)
    if (payload) {
      try { win.localStorage.setItem('e2e-orders', JSON.stringify(payload)); } catch {}
    }
    cy.request({
      method: 'POST',
      url: `${API_URL}/api/test/seed-orders`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: payload || {},
      failOnStatusCode: false
    });
    // Ensure the UI reflects the seeded data immediately
    cy.reload();
  });
});
// Custom command to log in as admin via API for stability
Cypress.Commands.add('loginAsAdmin', () => {
  cy.login('admin');
});
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// Custom command to log in a user by role
Cypress.Commands.add('login', (role) => {
  const credentials = {
    admin: { email: 'admin@test.com', password: 'Password123!' },
    customer: { email: 'customer@test.com', password: 'Password123!' },
    vendor: { email: 'vendor@test.com', password: 'Password123!' },
    global_admin: { email: 'global_admin@test.com', password: 'Password123!' },
    country_admin: { email: 'country_admin@test.com', password: 'Password123!' },
    // Backwards-compatible aliases used in some specs
    'global-admin': { email: 'global_admin@test.com', password: 'Password123!' },
    'country-admin': { email: 'country_admin@test.com', password: 'Password123!' },
  };

  const creds = credentials[role];
  if (!creds) throw new Error(`Unknown role for cy.login: ${role}`);
  const { email, password } = creds;

  // Seed first (idempotent), then try login; on 401, re-seed and retry once
  cy.ensureSeed().then(() => {
    return cy.request({
      method: 'POST',
      url: `${API_URL}/api/auth/login`,
      body: { email, password },
      failOnStatusCode: false
    }).then((res) => {
      if (res.status >= 400 || !res.body?.token) {
        // Retry once after ensuring seed
        return cy.ensureSeed().then(() =>
          cy.request({
            method: 'POST',
            url: `${API_URL}/api/auth/login`,
            body: { email, password },
            failOnStatusCode: false
          })
        );
      }
      return res;
    });
  }).then((res) => {
    // If still failing after retry, register a new user with the requested role and login
    if (!res || res.status >= 400 || !res.body?.token) {
      const roleMap = {
        admin: ['admin'],
        vendor: ['vendor'],
        customer: ['customer'],
        global_admin: ['admin', 'global_admin'],
        'global-admin': ['admin', 'global_admin'],
        country_admin: ['admin', 'country_admin'],
        'country-admin': ['admin', 'country_admin']
      };
      const roles = roleMap[role] || ['customer'];
      const uniqueEmail = `${role}.${Date.now()}@example.com`;
      return cy.request({
        method: 'POST',
        url: `${API_URL}/api/auth/register`,
        body: { name: `E2E ${role}`, email: uniqueEmail, password, roles, country: 'US' },
        failOnStatusCode: false
      }).then(() => cy.request('POST', `${API_URL}/api/auth/login`, { email: uniqueEmail, password }));
    }
    return res;
  }).then((res) => {
    const body = res.body || {};
    const token = body.token || '';
    // Normalize user object for app consumption
    const user = body.user || {
      _id: body._id,
      name: body.name,
      email: body.email,
      role: body.role || (Array.isArray(body.roles) ? body.roles[0] : undefined),
      roles: body.roles || (body.role ? [body.role] : [])
    };
    // Ensure we are on the AUT origin before touching localStorage so values persist for subsequent visits
    // Visiting '/' is cheap and guarantees cy.window() references the correct origin storage instead of about:blank
    cy.visit('/').then(() => {
      // Always set localStorage within the AUT window context for reliability
      cy.window().then((win) => {
        try {
          win.localStorage.setItem('token', token);
          // Some pages read an alternate key; keep in sync to avoid flake
          win.localStorage.setItem('merkato-token', token);
          win.localStorage.setItem('user', JSON.stringify(user));
        } catch (_) {}
      });
    });
  });
});
