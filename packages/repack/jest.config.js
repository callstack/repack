module.exports = {
  clearMocks: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFiles: ['./jest.setup.js'],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts?(x)'],
  // testMatch treats EVERY .ts under __tests__ as a suite: shared
  // fixture-building helpers live in __tests__/helpers/ to stay out.
  testPathIgnorePatterns: ['/node_modules/', '__tests__/helpers/'],
};
