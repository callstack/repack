import { getModulePaths } from '@callstack/repack';

export const nativeWindModuleRules = {
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
      test: /\.tsx$/,
      use: {
        loader: '@callstack/repack-plugin-nativewind/loader',
        options: {
          babelPlugins: [
            [
              '@babel/plugin-syntax-typescript',
              {
                isTSX: true,
                allowNamespaces: true,
                // jsxImportSource: 'react-native-css-interop',
              },
            ],
          ],
        },
      },
    },
    {
      test: /\.jsx?$/,
      use: {
        loader: '@callstack/repack-plugin-nativewind/loader',
        options: {
          babelPlugins: ['babel-plugin-syntax-hermes-parser'],
        },
      },
    },
    {
      test: /\.css?$/,
      use: {
        loader: '@callstack/repack-plugin-nativewind/cssLoader',
        // options: {
        //   babelPlugins: ['babel-plugin-syntax-hermes-parser'],
        // },
      },
    },
  ],
};
