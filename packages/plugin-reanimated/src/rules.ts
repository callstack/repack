const commonBabelOptions = {
  babelrc: false,
  configFile: false,
  compact: false,
};

const babelLoaderTS = ({ tsx }: { tsx: boolean }) => ({
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

const babelLoaderJS = {
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
      use: babelLoaderTS({ tsx: false }),
    },
    {
      test: /\.tsx$/,
      use: babelLoaderTS({ tsx: true }),
    },
    {
      test: /\.jsx?$/,
      use: babelLoaderJS,
    },
  ],
};
