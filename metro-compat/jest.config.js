module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testRegex: '__tests__/.*-test\\.js$',
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/resolver/__tests__/assets-test.js',
  ],
  fakeTimers: {
    enableGlobally: true,
    legacyFakeTimers: false,
  },
  transform: {
    '\\.[jt]s$': '<rootDir>/transformer.js',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  modulePathIgnorePatterns: ['/node_modules/', 'packages/[^/]+/build/'],
};
