const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000', // ✅ This is what was missing
    setupNodeEvents(on, config) {
      // Register custom db:seed task for E2E tests
      on('task', {
        async 'db:seed'() {
          const { exec } = require('child_process');
          return new Promise((resolve, reject) => {
            exec('node "../backend/seedOrders.js"', (error, stdout, stderr) => {
              if (error) {
                console.error(stderr);
                return reject(error);
              }
              console.log(stdout);
              resolve(true);
            });
          });
        }
      });
      return config;
    },
  },
});
