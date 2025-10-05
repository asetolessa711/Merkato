const { defineConfig } = require("cypress");
const axios = require('axios');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    requestTimeout: 10000,
  responseTimeout: 20000,
  // Control retries via env so we can enable them only on CI (e.g., CYPRESS_retries=2)
  retries: { runMode: Number(process.env.CYPRESS_retries || 0), openMode: 0 },
    env: {
      API_URL: process.env.CYPRESS_API_URL || 'http://localhost:5051'
    },
    setupNodeEvents(on, config) {
      const apiBase = process.env.CYPRESS_API_URL || config.env.API_URL || 'http://localhost:5051';
      config.env = { ...config.env, API_URL: apiBase };

      // Optional: Seed before each spec when requested (kept off by default for speed)
      const seedPerSpec = !!(config.env.SEED_PER_SPEC || process.env.CYPRESS_SEED_PER_SPEC);
      if (seedPerSpec) {
        on('before:spec', async () => {
          try {
            const url = `${apiBase.replace(/\/$/, '')}/api/dev/seed`;
            await axios.post(url);
            console.log(`✅ [before:spec] Seeded via ${url}`);
          } catch (e) {
            console.error('❌ [before:spec] Seed failed', e.message);
          }
        });
      }

      // Register custom tasks for E2E tests via HTTP and logging from browser context
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
        },
        'a11y:log'(msg) {
          try {
            console.log(String(msg));
          } catch (_) {
            // noop
          }
          return null;
        },
        'a11y:warn'(msg) {
          try {
            console.warn(String(msg));
          } catch (_) {
            // noop
          }
          return null;
        }
      });
      return config;
    },
  },
});
