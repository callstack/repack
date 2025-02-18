module.exports = {
  presets: ['module:@react-native/babel-preset'],
  comments: true,
  plugins: [
    [
      '@babel/plugin-transform-react-jsx',
      {
        runtime: 'automatic',
        importSource: 'nativewind',
      },
    ],
  ],
};
