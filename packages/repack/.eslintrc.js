module.exports = {
  extends: '@callstack/eslint-config/node',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      files: ['jest.setup.js'],
      env: {
        jest: true,
      },
      rules: {
        'import/no-extraneous-dependencies': 0,
      },
    },
    {
      files: ['**/__tests__/**'],
      extends: ['plugin:@typescript-eslint/disable-type-checked'],
    },
  ],
  settings: {
    jest: {
      version: 'latest',
    },
  },
};
