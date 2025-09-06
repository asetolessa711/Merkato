const { defineConfig } = require("cypress");
const axios = require('axios');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    requestTimeout: 10000,
    responseTimeout: 20000,
    retries: { runMode: 2, openMode: 0 },
    env: {
      API_URL: process.env.CYPRESS_API_URL || 'http://localhost:5051'
    },
    setupNodeEvents(on, config) {
      const apiBase = process.env.CYPRESS_API_URL || config.env.API_URL || 'http://localhost:5051';
      config.env = { ...config.env, API_URL: apiBase };

      // Register custom db:seed task for E2E tests via HTTP
      on('task', {
        async 'db:seed'() {
          try {
            const url = `${apiBase.replace(/\/$/, '')}/api/dev/seed`;
            await axios.post(url);
            console.log(`✅ Seeded via ${url}`);
            return true;
          } catch (e) {
            console.error('❌ Seed failed', e.message);
            return false;
          }
        }
      });
      return config;
    },
  },
});
