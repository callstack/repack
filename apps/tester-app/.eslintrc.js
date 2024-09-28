module.exports = {
  extends: '@callstack/eslint-config',
  parserOptions: {
    ecmaVersion: 'latest',
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    // eslint doesnt support package exports
    'import/no-unresolved': [2, { ignore: ['^@callstack/repack/commands'] }],
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
