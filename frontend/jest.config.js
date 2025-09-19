const path = require('path');

module.exports = {
  rootDir: '.',
  testEnvironment: 'jsdom',
  roots: [
  '<rootDir>/src'
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/tests/integration/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/tests/integration/**/*.test.js',
    '<rootDir>/tests/unit/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/tests/unit/**/*.test.js',
  ],
  setupFiles: [path.resolve(__dirname, './jest.env.setup.js')],
  setupFilesAfterEnv: [path.resolve(__dirname, './jest.setup.js')],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass|module\\.css)$': 'identity-obj-proxy',
    // axios is globally mocked in src/__mocks__/axios.js via setupTests
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(axios|react-router-dom|react-modal|react-icons|@?react|@?testing-library)/)'
  ],
  // Ensure mocks don’t leak between test files
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,jsx}',
    '!<rootDir>/src/index.js',
    '!<rootDir>/src/setupProxy.js',
    '!<rootDir>/src/**/__stories__/**',
    '!<rootDir>/src/**/*.{stories,story}.{js,jsx,ts,tsx}',
    '!<rootDir>/src/**/__mocks__/**',
    '!<rootDir>/src/**/stories/**',
    '!<rootDir>/src/**/examples/**',
    '!<rootDir>/src/**/*example*.*',
  ],
  coverageThreshold: {
    global: {
      // Current coverage: Lines ~34.5, Branches ~27.2, Funcs ~24.5, Stmts ~32.0
      // Set conservative gates slightly below to enforce and pass today; we can raise later.
      branches: 25,
      functions: 22,
      lines: 33,
      statements: 31,
    },
    // Per-folder nudges: keep these safely below current folder coverage
    // We will ratchet these up gradually (e.g., +1-2 points weekly) once the suite remains green.
    // Tip: use `npm run coverage:recommend` to compute next safe global gates from the latest run.
    './src/utils/**/*.js': {
      // Utils current (approx): Lines ~27, Branches ~18, Funcs ~13, Stmts ~24
      // Keep thresholds a bit under to avoid flakiness while we backfill tests.
      branches: 15,
      functions: 10,
      lines: 25,
      statements: 22,
    },
    './src/hooks/**/*.js': {
      // Hooks current (approx): Lines ~43, Branches ~29, Funcs ~33, Stmts ~41
      branches: 25,
      functions: 30,
      lines: 40,
      statements: 38,
    },
  },
  coverageDirectory: '<rootDir>/coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/__mocks__/',
    '/public/'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  verbose: true,
};
