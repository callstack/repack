module.exports = {
  extends: '@callstack/eslint-config/node',
  overrides: [
    {
      files: ['website/**'],
      extends: '@callstack/eslint-config/react',
      rules: {
        'react/react-in-jsx-scope': 0,
      },
    },
    {
      files: ['jest.setup.js'],
      env: {
        jest: true,
      },
    },
  ],
};
