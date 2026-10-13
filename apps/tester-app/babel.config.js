/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletsPluginOptions = {
  bundleMode: true,
  strictGlobal: true,
};

module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    [
      '@babel/plugin-transform-react-jsx',
      { runtime: 'automatic', importSource: 'nativewind' },
    ],
    ['react-native-worklets/plugin', workletsPluginOptions],
  ],
};
