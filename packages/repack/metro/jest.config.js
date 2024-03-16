module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testRegex: '__tests__/.*-test\\.js$',
  fakeTimers: {
    enableGlobally: true,
    legacyFakeTimers: false,
  },
  transform: {
    '\\.js$': '<rootDir>/transformer.js',
  },
  modulePathIgnorePatterns: ['/node_modules/', 'packages/[^/]+/build/'],
};
