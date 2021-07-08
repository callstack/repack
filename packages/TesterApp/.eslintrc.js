module.exports = {
  extends: '@callstack/eslint-config',
  overrides: [
    {
      files: ['*.config.js'],
      rules: {
        'import/no-extraneous-dependencies': 0,
      },
    },
  ],
};
