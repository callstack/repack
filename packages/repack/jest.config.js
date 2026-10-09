module.exports = {
  clearMocks: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@rspack/core$': '<rootDir>/jest.rspack-core-bridge.js',
  },
  setupFiles: ['./jest.setup.js'],
  testEnvironment: '<rootDir>/jest.environment.js',
  testMatch: ['**/__tests__/**/*.ts?(x)'],
};
