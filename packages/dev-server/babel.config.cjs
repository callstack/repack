module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 18,
        },
        modules: false,
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: ['babel-plugin-add-import-extension'],
};
