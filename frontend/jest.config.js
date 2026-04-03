const path = require('path');
const prettyReporterPath = path.resolve(__dirname, './prettyReporter.js');

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
  reporters: [prettyReporterPath],
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,jsx}',
    '!<rootDir>/src/index.js',
    '!<rootDir>/src/setupProxy.js',
    // Exclude test-only console silencer and similar utilities from coverage denominator
    '!<rootDir>/src/quietConsole.js',
    '!<rootDir>/src/**/__stories__/**',
    '!<rootDir>/src/**/*.{stories,story}.{js,jsx,ts,tsx}',
    '!<rootDir>/src/**/__mocks__/**',
    '!<rootDir>/src/**/stories/**',
    '!<rootDir>/src/**/examples/**',
    '!<rootDir>/src/**/*example*.*',
  ],
  coverageThreshold: {
    global: {
      // Current coverage (from coverage-compact.json):
      //   Lines ~34.5, Branches ~27.2, Funcs ~24.5, Stmts ~32.0
      // Ratchet gates to ~1 point below current to keep a small buffer.
      branches: 26,
      functions: 23,
      lines: 34,
      statements: 31,
    },
    // Per-folder nudges: keep these safely below current folder coverage
    // We will ratchet these up gradually (e.g., +1-2 points weekly) once the suite remains green.
    // Tip: use `npm run coverage:recommend` to compute next safe global gates from the latest run.
    './src/utils/**/*.js': {
      // Utils now strong (approx): Lines ~89, Branches ~61, Funcs ~83, Stmts ~89
      // Keep conservative but meaningful gates well below current to allow evolution.
      branches: 45,
      functions: 50,
      lines: 70,
      statements: 65,
    },
    './src/hooks/**/*.js': {
      // Hooks current (approx): Lines ~43, Branches ~29, Funcs ~33, Stmts ~41
      branches: 28,
      functions: 31,
      lines: 41,
      statements: 39,
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
