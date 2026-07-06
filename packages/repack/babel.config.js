module.exports = {
  presets: ['@babel/preset-typescript'],
  plugins: ['@babel/plugin-transform-export-namespace-from'],
  overrides: [
    {
      include: ['./src/**/implementation'],
      comments: false,
    },
    {
      include: ['./src/**/implementation', './src/modules'],
      sourceMaps: false,
    },
    {
      exclude: ['./src/**/implementation', './src/modules'],
      presets: [
        [
          '@babel/preset-env',
          {
            targets: { node: 18 },
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
  env: {
    // Transform everything in `test` environment, so unit test can pass.
    test: {
      presets: [['@babel/preset-env', { targets: { node: 18 } }]],
      // Jest's sandboxed CJS runtime cannot execute native `import()` without
      // --experimental-vm-modules (which breaks other tests), so transform
      // dynamic imports to `require` in tests - this also makes jest module
      // mocks apply to lazily-imported modules.
      plugins: ['@babel/plugin-transform-dynamic-import'],
    },
  },
};
