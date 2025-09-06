const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, './'),
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  setupFiles: [
    path.resolve(__dirname, './jest.env.setup.js'),
    path.resolve(__dirname, './tests/setupFiles/ensureTestImage.js')
  ],
  // Ensure we always close DB/socket handles after the test suite completes
  globalTeardown: path.resolve(__dirname, './jest.globalTeardown.js'),
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
  testTimeout: 30000, // Increase default timeout for slower integration tests
  // Ensure Jest process exits even if libraries leave open handles (CI/Windows stability)
  forceExit: true,
};
