module.exports = {
  clearMocks: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFiles: ['./jest.setup.js'],
  testEnvironment: 'node',
};
