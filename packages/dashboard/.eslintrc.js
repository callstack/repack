module.exports = {
  extends: '@callstack/eslint-config/react',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    '@typescript-eslint/no-floating-promises': 0,
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
