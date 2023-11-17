module.exports = {
  extends: '@callstack/eslint-config/node',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    /* These 2 rules do not play nicely with fastify */
    'require-await': 0,
    '@typescript-eslint/no-floating-promises': 0,
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
