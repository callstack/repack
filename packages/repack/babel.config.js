module.exports = {
  presets: ['@babel/preset-typescript'],
  plugins: [
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-transform-modules-commonjs',
  ],
  overrides: [
    {
      exclude: [
        './src/client/api',
        './src/client/setup/{*.ts, modules, utils}',
        './src/client/shared',
      ],
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 14,
            },
            modules: false,
          },
        ],
      ],
    },
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 14,
            },
          },
        ],
      ],
    },
  },
};
