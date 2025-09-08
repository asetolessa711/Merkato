const path = require("path");

module.exports = {
  rootDir: path.resolve(__dirname, "./"),
  testEnvironment: "node",
  testMatch: [
    "**/tests/unit/**/*.test.js",
    "**/tests/integration/**/*.test.js",
  ],
  setupFiles: [
    path.resolve(__dirname, "./jest.env.setup.js"),
    path.resolve(__dirname, "./tests/setupFiles/ensureTestImage.js"),
  ],
  setupFilesAfterEnv: [
    path.resolve(__dirname, "./jest.afterEnv.setup.js"),
  ],
  // Ensure we always close DB/socket handles after the test suite completes
  globalTeardown: path.resolve(__dirname, "./jest.globalTeardown.js"),
  moduleFileExtensions: ["js", "json"],
  collectCoverage: true,
  coverageThreshold: {
    global: {
  // Baseline thresholds aligned with current coverage; raise incrementally over time
  branches: 27,
  functions: 33,
  lines: 44,
  statements: 42,
    },
  },
  coverageDirectory: path.join(__dirname, "coverage"),
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/coverage/",
    "/__mocks__/",
    "/public/",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/build/"],
  clearMocks: true,
  verbose: true,
  testTimeout: 30000, // Increase default timeout for slower integration tests
  // Ensure Jest process exits even if libraries leave open handles (CI/Windows stability)
  forceExit: true,
};
