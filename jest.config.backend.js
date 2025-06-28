const base = require('./jest.config.base');
const path = require('path');

module.exports = {
  ...base,
  rootDir: './apps/backend',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: [path.resolve(__dirname, 'apps/backend/jest.env.setup.js')],
  // Optional overrides
  // collectCoverage: true,
  // coverageDirectory: '<rootDir>/coverage',
  // moduleFileExtensions: ['js', 'json'],
  // transform: { '^.+\\.js$': 'babel-jest' },
};
