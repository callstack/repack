module.exports = {
  extends: '@callstack/eslint-config/node',
  overrides: [{
    files: ["jest.setup.js"],
    env: {
      jest: true
    }
  }],
};
