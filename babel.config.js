module.exports = {
  presets: ['@babel/preset-typescript'],
  plugins: [
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
  ],
  overrides: [
    {
      include: './src/**',
      exclude: './src/client/ui/**',
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
      include: './src/client/ui/debugger/**',
      presets: [
        [
          '@babel/preset-env',
          {
            targets: '> 0.25%, not dead',
          },
        ],
      ],
    },
    {
      include: './src/client/ui/dashboard/**',
      presets: [
        [
          '@babel/preset-env',
          {
            targets: '> 0.25%, not dead',
          },
        ],
        '@babel/preset-typescript',
        '@babel/preset-react',
      ],
      plugins: [
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator',
      ],
    },
  ],
};
