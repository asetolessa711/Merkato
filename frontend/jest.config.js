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
    '<rootDir>/tests/integration/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/tests/integration/**/*.test.js',
  ],
  setupFiles: [path.resolve(__dirname, './jest.env.setup.js')],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass|module\\.css)$': 'identity-obj-proxy',
    '^axios$': '<rootDir>/node_modules/axios/dist/node/axios.cjs',
    '^axios/(.*)$': '<rootDir>/node_modules/axios/dist/node/axios.cjs',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(axios|react-router-dom|react-modal|react-icons|@?react|@?testing-library)/)'
  ],
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
