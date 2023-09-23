module.exports = {
  extends: '@callstack/eslint-config/react',
  rules: {
    '@typescript-eslint/no-floating-promises': 'off',
  },
  overrides: [
    {
      files: ['*.config.js'],
      rules: {
        'import/no-extraneous-dependencies': 0,
      },
    },
  ],
};
