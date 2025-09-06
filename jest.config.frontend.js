const path = require('path');

module.exports = {
  rootDir: './frontend',
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
  setupFiles: [path.resolve(__dirname, './jest.env.setup.js')],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/__mocks__/'
  ],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  // Optional: If using Babel
  // transform: { '^.+\\.(js|jsx)$': 'babel-jest' },
};
