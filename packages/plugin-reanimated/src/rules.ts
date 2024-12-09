import { getModulePaths } from '@callstack/repack';

export const reanimatedModuleRules = {
  exclude: getModulePaths([
    'react',
    'react-native',
    '@react-native',
    'react-native-macos',
    'react-native-windows',
    'react-native-tvos',
    '@callstack/react-native-visionos',
  ]),
  oneOf: [
    {
      test: /\.ts$/,
      use: {
        loader: '@callstack/repack-plugin-reanimated',
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
        loader: '@callstack/repack-plugin-reanimated',
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
        loader: '@callstack/repack-plugin-reanimated',
        options: {
          babelPlugins: ['babel-plugin-syntax-hermes-parser'],
        },
      },
    },
  ],
};
