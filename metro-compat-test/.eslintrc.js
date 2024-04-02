module.exports = {
  extends: '@callstack/eslint-config/node',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    '.eslintrc.js',
    'babel.config.js',
    'jest.config.js',
    'jest.setup.js',
    '**/__tests__/*.js',
  ],
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
