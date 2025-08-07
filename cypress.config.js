const { defineConfig } = require('cypress');
const axios = require('axios');

module.exports = defineConfig({
  e2e: {
    // Your frontend dev server (adjust if different)
    baseUrl: 'http://localhost:3000',

    // Where Cypress looks for support logic
    supportFile: 'frontend/cypress/support/e2e.js',

    // Where Cypress looks for test files
    specPattern: 'frontend/cypress/e2e/**/*.cy.{js,jsx}',

    // Exclude example/specs or legacy files (optional)
    excludeSpecPattern: ['**/examples/*'],

    // Folder paths for fixtures/downloads
    fixturesFolder: 'cypress/fixtures',
    downloadsFolder: 'cypress/downloads',

    // Custom tasks (e.g., DB seeding)
    setupNodeEvents(on, config) {
      on('task', {
        'db:seed': async () => {
          try {
            await axios.post('http://localhost:5000/api/dev/seed');
            console.log('✅ DB seeded via task.');
            return null;
          } catch (err) {
            console.error('❌ Seeding failed:', err.message);
            return null;
          }
        }
      });

      return config;
    },

    // Custom env vars for reuse across tests
    env: {
      SEED_DB: true,
      API_URL: 'http://localhost:5000/api',
      TEST_USER_EMAIL: 'testuser@example.com',
      TEST_USER_PASSWORD: 'Password123!',
    },

    // Behavior settings
    video: true,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true,
    defaultCommandTimeout: 10000, // Wait 10s for commands
    pageLoadTimeout: 90000,       // Wait up to 90s for page loads

    // Retry strategy
    retries: {
      runMode: 2,   // In CI
      openMode: 0   // In interactive mode
    }
  }
});
