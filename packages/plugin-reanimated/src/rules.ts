import { getModulePaths } from '@callstack/repack';

const workletsBabelPlugin = 'react-native-worklets/plugin';

export const createReanimatedModuleRules = (
  pluginOptions: Record<string, any> = {}
) => {
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

const reanimated4ModuleRules = createReanimatedModuleRules();

export { reanimated4ModuleRules };
