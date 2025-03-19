// @ts-check
import * as Repack from '@callstack/repack';
import webpack from 'webpack';

/** @type {(env: import('@callstack/repack').EnvOptions) => import('webpack').Configuration} */
export default (env) => {
  const { mode, context, platform } = env;

  return {
    mode,
    context,
    entry: './src/host/index.js',
    resolve: {
      ...Repack.getResolveOptions(),
    },
    output: {
      path: '[context]/build/host-app/[platform]',
      uniqueName: 'MFTester-HostApp',
    },
    module: {
      rules: [
        {
          test: /\.[cm]?[jt]sx?$/,
          use: 'babel-loader',
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
      new Repack.plugins.ModuleFederationPluginV1({
        name: 'HostApp',
        filename: 'HostApp.container.js.bundle',
        remotes: {
          MiniApp: `MiniApp@http://localhost:8082/${platform}/mf-manifest.json`,
        },
        shared: {
          react: {
            singleton: true,
            eager: true,
            requiredVersion: '19.0.0',
          },
          'react-native': {
            singleton: true,
            eager: true,
            requiredVersion: '0.78.0',
          },
          '@react-navigation/native': {
            singleton: true,
            eager: true,
            requiredVersion: '^6.1.18',
          },
          '@react-navigation/native-stack': {
            singleton: true,
            eager: true,
            requiredVersion: '^6.10.1',
          },
          'react-native-safe-area-context': {
            singleton: true,
            eager: true,
            requiredVersion: '5.3.0',
          },
          'react-native-screens': {
            singleton: true,
            eager: true,
            requiredVersion: '4.9.2',
          },
          '@react-native-async-storage/async-storage': {
            singleton: true,
            eager: true,
            requiredVersion: '2.1.1',
          },
        },
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
    ],
  };
};
