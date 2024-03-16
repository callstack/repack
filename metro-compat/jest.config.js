module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testRegex: '__tests__/.*-test\\.js$',
  fakeTimers: {
    enableGlobally: true,
    legacyFakeTimers: false,
  },
  transform: {
    '\\.[jt]s$': '<rootDir>/transformer.js',
  },
  modulePathIgnorePatterns: ['/node_modules/', 'packages/[^/]+/build/'],
};
