const base = require('./jest.config.base');
const path = require('path');

module.exports = {
  ...base,
  rootDir: './apps/backend',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: [path.resolve(__dirname, 'apps/backend/jest.env.setup.js')],
  // Ensure dev-only Codex prototype is excluded if this config is ever used
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/tests/unit/codexAgent.test.js',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/__mocks__/',
    '/public/',
    '/utils/codexAgent.js',
    '/routes/codex.js',
  ],
  // Optional overrides
  // collectCoverage: true,
  // coverageDirectory: '<rootDir>/coverage',
  // moduleFileExtensions: ['js', 'json'],
  // transform: { '^.+\\.js$': 'babel-jest' },
};
