// @ts-check
import * as Repack from '@callstack/repack';
import webpack from 'webpack';
import pkg from '../package.json' with { type: 'json' };

export default Repack.defineWebpackConfig((env) => {
  const { mode, context, platform } = env;

  return {
    mode,
    context,
    entry: './src/host/index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
    },
    output: {
      path: '[context]/build/host-app/[platform]',
      uniqueName: 'MF2Tester-HostApp',
    },
    module: {
      rules: [
        {
          test: /\.[cm]?[jt]sx?$/,
          use: '@callstack/repack/babel-swc-loader',
          type: 'javascript/auto',
        },
        ...Repack.getAssetTransformRules(),
      ],
    },
    plugins: [
      // @ts-ignore
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/host-app/${platform}/output-remote`,
          },
        ],
      }),
      // @ts-ignore
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'HostApp',
        filename: 'HostApp.container.js.bundle',
        remotes: {
          MiniApp: `MiniApp@http://localhost:8082/${platform}/mf-manifest.json`,
        },
        dts: false,
        shared: {
          react: {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies.react,
          },
          'react-native': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['react-native'],
          },
          '@react-navigation/native': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['@react-navigation/native'],
          },
          '@react-navigation/native-stack': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['@react-navigation/native-stack'],
          },
          'react-native-safe-area-context': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['react-native-safe-area-context'],
          },
          'react-native-screens': {
            singleton: true,
            eager: true,
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
