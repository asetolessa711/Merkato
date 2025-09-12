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
  // Tiered coverage ratchet: start slightly below current (Lines 34.09, Branches 27.18, Funcs 27.27, Stmts 32.78)
  // Increase after Tier 3.
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 25,
      lines: 32,
      statements: 32,
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
  // Governance Tagging Guidance:
  //  - Use @trust-ui on tests covering authentication, payments, invoices
  //  - Use @persona-ui:vendor, @persona-ui:customer, @persona-ui:admin to classify flows
  //  - Future: dashboards will aggregate coverage & failure rates by these tags
};
