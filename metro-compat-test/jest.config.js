module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testRegex: '__tests__/.*-test\\.js$',
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    // assets-test are not compatible with webpack's enhanced-resolve
    '<rootDir>/resolver/__tests__/assets-test.js',
    // index-test are almost entirely for legacy metro features which are not supported
    '<rootDir>/resolver/__tests__/index-test.js',
  ],
  transform: { '\\.[jt]s$': 'babel-jest' },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
