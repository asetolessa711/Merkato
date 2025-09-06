// ***********************************************************
// This support file is loaded automatically before your test files.
// Use this for global config, reusable hooks, or extensions.
// ***********************************************************

// Import custom commands
import './commands';

// ✅ Automatically seed DB before each spec if enabled
before(() => {
  if (Cypress.env('SEED_DB')) {
    cy.task('db:seed');
  }
});

// ✅ Optionally log the current test user email
beforeEach(() => {
  const email = Cypress.env('TEST_USER_EMAIL');
  if (email) {
    cy.log(`👤 Using test user: ${email}`);
  }
});
