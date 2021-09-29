module.exports = {
  presets: ['@babel/preset-typescript'],
  plugins: [
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
  ],
  overrides: [
    {
      exclude: [
        './src/client/chunks-api',
        './src/client/runtime',
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
