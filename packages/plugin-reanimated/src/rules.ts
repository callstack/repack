import { getModulePaths } from '@callstack/repack';

const createReanimatedModuleRules = (majorVersion: number) => {
  const workletsBabelPlugin =
    majorVersion < 4
      ? 'react-native-reanimated/plugin'
      : 'react-native-worklets/plugin';

  return {
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
              workletsBabelPlugin,
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
              workletsBabelPlugin,
            ],
          },
        },
      },
      {
        test: /\.[cm]?jsx?$/,
        use: {
          loader: '@callstack/repack-plugin-reanimated/loader',
          options: {
            babelPlugins: [
              'babel-plugin-syntax-hermes-parser',
              workletsBabelPlugin,
            ],
          },
        },
      },
    ],
  };
};

const reanimated3ModuleRules = createReanimatedModuleRules(3);
const reanimated4ModuleRules = createReanimatedModuleRules(4);

// backwards compatibility export
const reanimatedModuleRules = reanimated3ModuleRules;

export {
  reanimatedModuleRules,
  reanimated3ModuleRules,
  reanimated4ModuleRules,
};
