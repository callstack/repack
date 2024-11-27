const commonBabelOptions = {
  babelrc: false,
  configFile: false,
  compact: false,
};

const babelLoaderOptionsTS = ({ tsx }: { tsx: boolean }) => ({
  loader: 'babel-loader',
  options: {
    ...commonBabelOptions,
    plugins: [
      [
        '@babel/plugin-syntax-typescript',
        { isTSX: tsx, allowNamespaces: true },
      ],
      'react-native-reanimated/plugin',
    ],
  },
});

const babelLoaderOptionsJS = {
  loader: 'babel-loader',
  options: {
    ...commonBabelOptions,
    plugins: [
      'babel-plugin-syntax-hermes-parser',
      'react-native-reanimated/plugin',
    ],
  },
};

export const moduleRules = {
  oneOf: [
    {
      test: /\.ts$/,
      use: babelLoaderOptionsTS({ tsx: false }),
    },
    {
      test: /\.tsx$/,
      use: babelLoaderOptionsTS({ tsx: true }),
    },
    {
      test: /\.jsx?$/,
      use: babelLoaderOptionsJS,
    },
  ],
};
