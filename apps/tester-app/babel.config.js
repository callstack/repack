module.exports = {
  plugins: [
    [
      '@babel/plugin-transform-react-jsx',
      { runtime: 'automatic', importSource: 'nativewind' },
    ],
    'react-native-worklets/plugin',
  ],
};
