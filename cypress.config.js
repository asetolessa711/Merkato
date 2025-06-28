const { defineConfig } = require('cypress');
const axios = require('axios');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx}',
    fixturesFolder: 'cypress/fixtures',
    downloadsFolder: 'cypress/downloads',

    setupNodeEvents(on, config) {
      // Add the custom db:seed task
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

    env: {
      SEED_DB: true,
      API_URL: 'http://localhost:5000/api',
      TEST_USER_EMAIL: 'testuser@example.com',
      TEST_USER_PASSWORD: 'Password123!'
    },

   video: true,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 90000,
    retries: {
      runMode: 2,
      openMode: 0
    }
  }
});