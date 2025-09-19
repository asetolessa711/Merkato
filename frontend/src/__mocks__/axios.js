// src/__mocks__/axios.js
// Global manual mock to ensure axios methods always return Promises in tests.
const axios = {
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  patch: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  create: jest.fn(function () { return this; }),
  isAxiosError: (e) => !!(e && e.isAxiosError),
};

module.exports = axios;

const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => mockAxios),
  interceptors: { request: { use: jest.fn(), eject: jest.fn() }, response: { use: jest.fn(), eject: jest.fn() } },
  defaults: { headers: { common: {} } },
};
export default mockAxios;
module.exports = mockAxios;

