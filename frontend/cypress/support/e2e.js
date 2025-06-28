// cypress/support/e2e.js

// Import custom commands (if any) from support/commands.js
import './commands';

// Global setup: Seed DB once before all tests if enabled
before(() => {
  cy.log('🚀 Cypress Test Suite Started');
  if (Cypress.env('SEED_DB')) {
    cy.task('db:seed').then((result) => {
      if (result && result.error) {
        throw new Error('DB seeding failed');
      }
    });
  }
});

// Optional: Per-test setup (add as needed)
// beforeEach(() => {
//   cy.clearCookies();
//   // Add more per-test setup if required
// });

after(() => {
  cy.log('🏁 Cypress Test Suite Finished');
});