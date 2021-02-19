module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 12,
        },
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: [
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
  ],
};
