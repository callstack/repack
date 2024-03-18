module.exports = {
  extends: '@callstack/eslint-config/node',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    'import/no-extraneous-dependencies': 'off',
  },
  settings: {
    jest: {
      version: 'latest',
    },
  },
  overrides: [
    {
      files: ['jest.setup.js'],
      env: {
        jest: true,
      },
    },
  ],
};
