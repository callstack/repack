module.exports = {
  extends: '@callstack/eslint-config/react',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    'import/no-extraneous-dependencies': 0,
  },
};
