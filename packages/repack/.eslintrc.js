const path = require('path');

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
      files: ['metro/**'],
      env: {
        jest: true,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: path.join(__dirname, 'metro'),
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
