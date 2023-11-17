module.exports = {
  extends: '@callstack/eslint-config',
  parserOptions: {
    ecmaVersion: 'latest',
    project: true,
    tsconfigRootDir: __dirname,
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
