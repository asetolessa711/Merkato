const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, './'),
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  setupFiles: [path.resolve(__dirname, './jest.env.setup.js')],
  moduleFileExtensions: ['js', 'json'],
  collectCoverage: true,
  coverageDirectory: path.join(__dirname, 'coverage'),
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
  clearMocks: true,
  verbose: true,
  // testTimeout: 20000, // Uncomment if you have slow integration tests
};
