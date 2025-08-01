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

  cy.request('POST', 'http://localhost:5000/api/auth/login', { email, password })
    .then((res) => {
      const { token, user } = res.body;
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('user', JSON.stringify(user));
    });
});