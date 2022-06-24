module.exports = {
  extends: '@callstack/eslint-config',
  parserOptions: {
    ecmaVersion: 'latest',
  },
  overrides: [
    {
      files: ['*.config.{js,mjs,cjs}'],
      rules: {
        'import/no-extraneous-dependencies': 0,
      },
    },
  ],
};
