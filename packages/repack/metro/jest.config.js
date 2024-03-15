module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testRegex: 'resolver/.*-test\\.js$',
  fakeTimers: {
    enableGlobally: true,
    legacyFakeTimers: false,
  },
  transform: {
    '\\.js$': '<rootDir>/transformer.js',
  },
  modulePathIgnorePatterns: ['/node_modules/', 'packages/[^/]+/build/'],
};
