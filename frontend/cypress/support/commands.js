import 'cypress-file-upload';

const API_URL = Cypress.env('API_URL') || 'http://localhost:5051';

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
    'global-admin': { email: 'globaladmin@test.com', password: 'Password123!' },
    'country-admin': { email: 'countryadmin@test.com', password: 'Password123!' },
  };

  const { email, password } = credentials[role];

  cy.request('POST', `${API_URL}/api/auth/login`, { email, password })
    .then((res) => {
      const body = res.body || {};
      const token = body.token;
      // Normalize user object for app consumption
      const user = body.user || {
        _id: body._id,
        name: body.name,
        email: body.email,
        role: body.role || (Array.isArray(body.roles) ? body.roles[0] : undefined),
        roles: body.roles || (body.role ? [body.role] : [])
      };
      window.localStorage.setItem('token', token || '');
      window.localStorage.setItem('user', JSON.stringify(user));
    });
});
