const { defineConfig } = require('cypress');
const axios = require('axios');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',

    supportFile: 'frontend/cypress/support/e2e.js',
    specPattern: 'frontend/cypress/e2e/**/*.cy.{js,jsx}',
    excludeSpecPattern: ['**/examples/*'],

    fixturesFolder: 'cypress/fixtures',
    downloadsFolder: 'cypress/downloads',

    setupNodeEvents(on, config) {
      // Normalize API base from env (CYPRESS_API_URL -> config.env.API_URL)
      const apiBase = process.env.CYPRESS_API_URL || config.env.API_URL || 'http://localhost:5051';
      config.env = { ...config.env, API_URL: apiBase };

      on('task', {
        'db:seed': async () => {
          try {
            const seedUrl = `${apiBase.replace(/\/$/, '')}/api/dev/seed`;
            await axios.post(seedUrl);
            console.log(`✅ DB seeded via task at ${seedUrl}`);
            return { ok: true };
          } catch (err) {
            console.error('❌ Seeding failed:', err.message);
            return { ok: false, error: err.message };
          }
        }
      });

      return config;
    },

    env: {
      SEED_DB: true,
      // API_URL should be a base host like http://localhost:5051 (no trailing /api)
      API_URL: process.env.CYPRESS_API_URL || 'http://localhost:5051',
      TEST_USER_EMAIL: 'customer@test.com',
      TEST_USER_PASSWORD: 'Password123!',
    },

    video: true,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 90000,

    retries: { runMode: 2, openMode: 0 }
  }
});
