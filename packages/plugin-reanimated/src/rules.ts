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
      test: /\.[cm]?ts$/,
      use: {
        loader: '@callstack/repack-plugin-reanimated/loader',
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
      test: /\.[cm]?tsx$/,
      use: {
        loader: '@callstack/repack-plugin-reanimated/loader',
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
      test: /\.[cm]?jsx?$/,
      use: {
        loader: '@callstack/repack-plugin-reanimated/loader',
        options: {
          babelPlugins: ['babel-plugin-syntax-hermes-parser'],
        },
      },
    },
  ],
};
