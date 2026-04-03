const path = require("path");

module.exports = (() => {
  const disableThreshold = process.env.FLOW_COVERAGE === 'true' || process.env.JEST_DISABLE_THRESHOLD === 'true';
  const collectCoverage = process.env.CI === 'true' || process.env.JEST_COVERAGE === 'true';
  const prettyReporterPath = path.resolve(__dirname, "./prettyReporter.js");
  const cfg = {
    rootDir: path.resolve(__dirname, "./"),
    testEnvironment: "node",
    testMatch: [
      "**/tests/unit/**/*.test.js",
      "**/tests/integration/**/*.test.js",
    ],
    setupFiles: [
      path.resolve(__dirname, "./jest.env.setup.js"),
    ],
    setupFilesAfterEnv: [
      path.resolve(__dirname, "./jest.afterEnv.setup.js"),
    ],
    // Ensure we always close DB/socket handles after the test suite completes
    globalTeardown: path.resolve(__dirname, "./jest.globalTeardown.js"),
    moduleFileExtensions: ["js", "json"],
    collectCoverage,
    coverageDirectory: path.join(__dirname, "coverage"),
    coveragePathIgnorePatterns: [
      "/node_modules/",
      "/coverage/",
      "/__mocks__/",
      "/public/",
      // Exclude development-only Codex prototype files from coverage
      "/utils/codexAgent.js",
      "/routes/codex.js",
      // Exclude dev/test seed and experimental routes from coverage
      "/routes/devSeedRoute.js",
      "/routes/testSeedOrdersRoute.js",
      "/routes/testSeedInvoicesRoute.js",
      "/routes/testEmailRoute.js",
      "/routes/telebirrRoutes.js",
    ],
    testPathIgnorePatterns: [
      "/node_modules/",
      "/dist/",
      "/build/",
      // Exclude development-only Codex tests
      "/tests/unit/codexAgent.test.js",
    ],
    clearMocks: true,
    verbose: true,
    reporters: [prettyReporterPath],
    testTimeout: 30000, // Increase default timeout for slower integration tests
    // Keep test commands from hanging due lingering open handles in integration suites.
    forceExit: true,
  };

  if (!disableThreshold && collectCoverage) {
    cfg.coverageThreshold = {
      global: {
        // Thresholds ratcheted slightly under latest stable coverage snapshot
        // Current approx: Lines ~79.5, Branches ~64.7, Funcs ~79.7, Stmts ~77.6
        // Keep a small buffer to avoid flakiness across environments.
        branches: 64,
        functions: 79,
        lines: 79,
        statements: 77,
      },
    };
  }

  return cfg;
})();
