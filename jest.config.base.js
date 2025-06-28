module.exports = {
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  verbose: true,
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__mocks__/',
    '/coverage/',
  ],
  moduleFileExtensions: ['js', 'json'],
};