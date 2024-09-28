module.exports = {
  extends: '@callstack/eslint-config/node',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      files: ['client.js'],
      rules: {
        'import/no-unresolved': 0,
      },
    },
    {
      files: ['jest.setup.js'],
      env: {
        jest: true,
      },
      rules: {
        'import/no-extraneous-dependencies': 0,
      },
    },
    {
      files: ['**/__tests__/**'],
      extends: ['plugin:@typescript-eslint/disable-type-checked'],
      rules: {
        'require-await': 0,
        'import/no-extraneous-dependencies': 0,
      },
    },
  ],
  settings: {
    jest: {
      version: 'latest',
    },
    'import/resolver': {
      typescript: {
        project: ['tsconfig.json', '../dev-server/tsconfig.json'],
      },
    },
  },
};
