module.exports = {
  extends: '@callstack/eslint-config/node',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  settings: {
    jest: {
      version: 'latest',
    },
  },
};
