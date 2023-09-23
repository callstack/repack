module.exports = {
  extends: '@callstack/eslint-config/node',
  rules: {
    '@typescript-eslint/no-floating-promises': 'off',
  },
  settings: {
    'import/resolver': {
      typescript: true,
    },
  },
};
