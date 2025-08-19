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
      uniqueName: 'MFTester-HostApp',
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
      new Repack.plugins.ModuleFederationPluginV1({
        name: 'HostApp',
        shared: {
          react: {
            singleton: true,
            eager: true,
            requiredVersion: '19.1.0',
          },
          'react-native': {
            singleton: true,
            eager: true,
            requiredVersion: '0.81.0',
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
          '@react-native-async-storage/async-storage': {
            singleton: true,
            eager: true,
            requiredVersion:
              pkg.dependencies['@react-native-async-storage/async-storage'],
          },
        },
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
      new webpack.EnvironmentPlugin({
        MF_CACHE: null,
      }),
    ],
  };
});
