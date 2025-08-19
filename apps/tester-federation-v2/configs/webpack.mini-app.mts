import * as Repack from '@callstack/repack';
import webpack from 'webpack';
import pkg from '../package.json' with { type: 'json' };

export default Repack.defineWebpackConfig((env) => {
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
        {
          test: /\.[cm]?[jt]sx?$/,
          use: '@callstack/repack/babel-swc-loader',
          type: 'javascript/auto',
        },
        ...Repack.getAssetTransformRules({ inline: true }),
      ],
    },
    plugins: [
      // @ts-ignore
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/mini-app/${platform}/output-remote`,
          },
        ],
      }),
      // @ts-ignore
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
            requiredVersion: '0.81.0',
          },
          '@react-navigation/native': {
            singleton: true,
            eager: false,
            requiredVersion: pkg.dependencies['@react-navigation/native'],
          },
          '@react-navigation/native-stack': {
            singleton: true,
            eager: false,
            requiredVersion: pkg.dependencies['@react-navigation/native-stack'],
          },
          'react-native-safe-area-context': {
            singleton: true,
            eager: false,
            requiredVersion: pkg.dependencies['react-native-safe-area-context'],
          },
          'react-native-screens': {
            singleton: true,
            eager: false,
            requiredVersion: pkg.dependencies['react-native-screens'],
          },
        },
      }),
      // silence missing @react-native-masked-view optionally required by @react-navigation/elements
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
    ],
  };
});
