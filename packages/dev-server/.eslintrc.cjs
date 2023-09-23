module.exports = {
  extends: '@callstack/eslint-config/node',
  rules: {
    'require-await': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
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
