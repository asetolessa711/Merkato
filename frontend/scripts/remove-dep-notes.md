This repository previously used axios-mock-adapter for some tests via tests/__mocks__/mockAxios.js.
We have migrated entirely to a global manual axios mock (see src/__mocks__/axios.js and setupTests.js).
It is safe to remove axios-mock-adapter from devDependencies and delete tests/__mocks__/mockAxios.js.
