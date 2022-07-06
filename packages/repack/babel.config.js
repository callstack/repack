module.exports = {
  presets: ['@babel/preset-typescript'],
  plugins: ['@babel/plugin-proposal-export-namespace-from'],
  overrides: [
    {
      include: ['./src/**/runtime/implementation'],
      comments: false,
    },
    {
      exclude: ['./src/**/runtime/implementation', './src/modules'],
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 14,
            },
            // Disable CJS transform and add it manually.
            // Otherwise it will replace `import(...)` with `require(...)`, which
            // is not what we want.
            modules: false,
          },
        ],
      ],
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    },
  ],
};
