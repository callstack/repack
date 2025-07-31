module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    [
      '@babel/plugin-transform-react-jsx',
      { runtime: 'automatic', importSource: 'nativewind' },
    ],
    'react-native-worklets/plugin',
  ],
};
