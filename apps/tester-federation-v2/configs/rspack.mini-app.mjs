// @ts-check
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';

/** @type {(env: import('@callstack/repack').EnvOptions) => import('@rspack/core').Configuration} */
export default (env) => {
  const { mode, context, platform } = env;

  return {
    mode,
    context,
    entry: './src/mini/index.js',
    resolve: {
      ...Repack.getResolveOptions(),
    },
    output: {
      path: '[context]/build/mini-app/[platform]',
      uniqueName: 'MF2Tester-MiniApp',
    },
    module: {
      rules: [
        ...Repack.getJsTransformRules(),
        ...Repack.getAssetTransformRules({ inline: true }),
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/mini-app/${platform}/output-remote`,
          },
        ],
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'MiniApp',
        filename: 'MiniApp.container.js.bundle',
        exposes: {
          './MiniAppNavigator': './src/mini/navigation/MainNavigator',
        },
        dts: false,
        shared: {
          react: {
            singleton: true,
            eager: false,
            requiredVersion: '18.3.1',
          },
          'react-native': {
            singleton: true,
            eager: false,
            requiredVersion: '0.76.3',
          },
          '@react-navigation/native': {
            singleton: true,
            eager: false,
            requiredVersion: '^6.1.18',
          },
          '@react-navigation/native-stack': {
            singleton: true,
            eager: false,
            requiredVersion: '^6.10.1',
          },
          'react-native-safe-area-context': {
            singleton: true,
            eager: false,
            requiredVersion: '^4.14.0',
          },
          'react-native-screens': {
            singleton: true,
            eager: false,
            requiredVersion: '^3.35.0',
          },
        },
      }),
      // silence missing @react-native-masked-view optionally required by @react-navigation/elements
      new rspack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
    ],
  };
};
