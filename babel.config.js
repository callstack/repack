module.exports = {
  presets: ['@babel/preset-typescript'],
  plugins: [
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
  ],
  overrides: [
    {
      include: './src/**',
      exclude: './src/client/**',
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
    {
      include: './src/client/**',
      presets: [
        [
          '@babel/preset-env',
          {
            targets: '> 0.25%, not dead',
          },
        ],
      ],
    },
  ],
};
