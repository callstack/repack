export const reanimatedModuleRules = {
  oneOf: [
    {
      test: /\.ts$/,
      use: {
        loader: '@callstack/repack-reanimated-plugin',
        options: {
          babelPlugins: [
            [
              '@babel/plugin-syntax-typescript',
              { isTSX: false, allowNamespaces: true },
            ],
          ],
        },
      },
    },
    {
      test: /\.tsx$/,
      use: {
        loader: '@callstack/repack-reanimated-plugin',
        options: {
          babelPlugins: [
            [
              '@babel/plugin-syntax-typescript',
              { isTSX: true, allowNamespaces: true },
            ],
          ],
        },
      },
    },
    {
      test: /\.jsx?$/,
      use: {
        loader: '@callstack/repack-reanimated-plugin',
        options: {
          babelPlugins: ['babel-plugin-syntax-hermes-parser'],
        },
      },
    },
  ],
};
