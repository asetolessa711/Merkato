const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000', // ✅ This is what was missing
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
