import { getModulePaths } from '@callstack/repack';

export const createReanimatedModuleRules = (
  majorVersion: number,
  pluginOptions: Record<string, any> = {}
) => {
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
              [workletsBabelPlugin, pluginOptions],
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
              [workletsBabelPlugin, pluginOptions],
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
              '@callstack/repack/babel-plugin-syntax-react-native',
              [workletsBabelPlugin, pluginOptions],
            ],
          },
        },
      },
    ],
  };
};

const reanimated3ModuleRules = createReanimatedModuleRules(3);
const reanimated4ModuleRules = createReanimatedModuleRules(4);

export { reanimated3ModuleRules, reanimated4ModuleRules };
