module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-worklets/plugin'],
  comments: true,
  overrides: [
    {
      // Regex instead of a relative string: babel resolves strings against the
      // launch cwd, and the rspack CLI launches from the repo root.
      test: /[\\/]src[\\/]host[\\/]/,
      plugins: [
        [
          '@babel/plugin-transform-react-jsx',
          { runtime: 'automatic', importSource: 'nativewind' },
        ],
      ],
    },
  ],
};
