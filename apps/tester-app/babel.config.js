module.exports = {
  plugins: [
    '@babel/plugin-syntax-typescript',
    '@react-native/babel-plugin-codegen',
    '@babel/plugin-transform-flow-strip-types',
    [
      '@babel/plugin-transform-react-jsx',
      { runtime: 'automatic', importSource: 'nativewind' },
    ],
    'react-native-reanimated/plugin',
  ],
  overrides: [
    {
      test: /\.ts$/,
      plugins: [
        [
          '@babel/plugin-syntax-typescript',
          { isTSX: false, allowNamespaces: true },
        ],
      ],
    },
    {
      test: /\.tsx$/,
      plugins: [
        [
          '@babel/plugin-syntax-typescript',
          { isTSX: true, allowNamespaces: true },
        ],
      ],
    },
  ],
};
