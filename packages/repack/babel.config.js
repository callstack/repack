module.exports = {
  presets: ['@babel/preset-typescript'],
  plugins: [
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
  ],
  overrides: [
    {
      exclude: [
        './src/client/api',
        './src/client/setup',
        './src/client/shared',
      ],
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 12,
            },
          },
        ],
      ],
    },
  ],
};
