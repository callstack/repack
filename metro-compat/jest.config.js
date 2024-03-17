module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testRegex: '__tests__/.*-test\\.js$',
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    // assets-test are not compatible with webpack's enhanced-resolve
    '<rootDir>/resolver/__tests__/assets-test.js',
    // index-test are mostly for legacy metro features which are not supported
    '<rootDir>/resolver/__tests__/index-test.js',
  ],
  fakeTimers: {
    enableGlobally: true,
    legacyFakeTimers: false,
  },
  transform: {
    '\\.[jt]s$': 'babel-jest',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/align-spec.js'],
  modulePathIgnorePatterns: ['/node_modules/', 'packages/[^/]+/build/'],
};
