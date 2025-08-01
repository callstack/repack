import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';

export default Repack.defineRspackConfig((env) => {
  const { mode, context, platform } = env;

  return {
    mode,
    context,
    entry: './src/mini/index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
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
            requiredVersion: '19.1.0',
          },
          'react-native': {
            singleton: true,
            eager: false,
            requiredVersion: '0.80.0',
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
            requiredVersion: '^5.5.0',
          },
          'react-native-screens': {
            singleton: true,
            eager: false,
            requiredVersion: '^4.11.1',
          },
        },
      }),
      // silence missing @react-native-masked-view optionally required by @react-navigation/elements
      new rspack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
    ],
  };
});
