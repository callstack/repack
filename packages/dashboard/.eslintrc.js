module.exports = {
  extends: '@callstack/eslint-config/react',
  overrides: [
    {
      files: ['*.config.js'],
      rules: {
        'import/no-extraneous-dependencies': 0,
      },
    },
  ],
};
