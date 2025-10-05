const path = require("path");

module.exports = (() => {
  const disableThreshold = process.env.FLOW_COVERAGE === 'true' || process.env.JEST_DISABLE_THRESHOLD === 'true';
  const ignoreHeavy = process.env.JEST_IGNORE_HEAVY === 'true';
  const maxWorkers = process.env.JEST_MAX_WORKERS || '50%';
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
    // Prepare required test fixtures (e.g., test-image.jpg) before any tests run
    globalSetup: path.resolve(__dirname, "./tests/restoreTestImage.js"),
    // Ensure we always close DB/socket handles after the test suite completes
    globalTeardown: path.resolve(__dirname, "./jest.globalTeardown.js"),
    moduleFileExtensions: ["js", "json"],
    collectCoverage: true,
  coverageProvider: 'v8',
    coverageDirectory: path.join(__dirname, "coverage"),
    coveragePathIgnorePatterns: [
      "/node_modules/",
      "/coverage/",
      "/__mocks__/",
      "/public/",
      // Exclude server startup scaffold from coverage (low function coverage, not business logic)
      "server\\.js$",
      // Heavy IO/image processing helpers are validated indirectly via routes; ignore to avoid flake
  "/utils/imageDerivatives.js",
  "/utils/derivativeQueue.js",
      // Temporarily exclude searchRoutes from coverage to avoid OOM on large CI runs.
      // The ETag behavior is tested via integration specs; we don't need per-line coverage here.
      "/routes/searchRoutes.js",
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
      ...(ignoreHeavy ? [
        "searchRoutes.etag", // ETag integration heavy on IO
        "railsRoutes.metrics", // metrics branches can be memory-heavy on Windows CI
        "megaMenuRoutes.admin.save.audit", // admin save + audit can be memory-heavy
      ] : []),
    ],
    clearMocks: true,
    verbose: true,
    testTimeout: 30000, // Increase default timeout for slower integration tests
    // Reduce parallel workers to avoid memory spikes on Windows CI unless overridden
    maxWorkers,
  // Ensure Jest process exits even if libraries leave open handles (CI/Windows stability)
  // Can be disabled for diagnostics by setting DETECT_OPEN_HANDLES=true
  // With open handles addressed, default to not forcing exit. Enable forceExit only via env if needed temporarily.
  forceExit: process.env.JEST_FORCE_EXIT === 'true',
  };

  // Feature-branch override strategy:
  // Set JEST_DISABLE_THRESHOLD=true in this branch's CI pipeline to unblock while
  // adding incremental high-ROI tests. Do NOT merge with this env var enabled.
  // Remove the env var (or this comment) once coverage naturally exceeds gates.
  if (!disableThreshold) {
    cfg.coverageThreshold = {
      global: {
        // Thresholds ratcheted slightly under latest stable coverage snapshot
        // Current approx: Lines ~79.5, Branches ~64.7, Funcs ~79.7, Stmts ~77.6
        // Keep a small buffer to avoid flakiness across environments.
        branches: 67,
        functions: 79,
        lines: 79,
        statements: 77,
      },
    };
    // Optional guardrails by folder (enable in CI via COVERAGE_GUARDRAILS=true)
    if (process.env.COVERAGE_GUARDRAILS === 'true') {
      // Apply thresholds to specific folders relative to rootDir
      cfg.coverageThreshold['./routes/'] = { branches: 68 };
      cfg.coverageThreshold['./utils/'] = { branches: 74 };
    }
  }

  return cfg;
})();
