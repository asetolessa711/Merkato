const path = require('path');

module.exports = {
  rootDir: '.',
  testEnvironment: 'jsdom',
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/src/tests/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/tests/**/*.spec.{js,jsx,ts,tsx}'
  ],
  setupFiles: [path.resolve(__dirname, './jest.env.setup.js')],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass|module\\.css)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  collectCoverage: true,
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
