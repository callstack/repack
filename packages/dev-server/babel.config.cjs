module.exports = {
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
    '@babel/preset-typescript',
  ],
  overrides: [
    {
      exclude: ['./src/plugins/wss/servers/DeviceWrapper.js'],
      plugins: ['babel-plugin-add-import-extension'],
    },
  ],
};
