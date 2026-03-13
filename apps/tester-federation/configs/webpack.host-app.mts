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
      // @ts-expect-error
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/host-app/${platform}/output-remote`,
          },
        ],
      }),
      // @ts-expect-error
      new Repack.plugins.ModuleFederationPluginV1({
        name: 'HostApp',
        shared: {
          react: {
            singleton: true,
            eager: true,
            requiredVersion: '19.2.3',
          },
          'react-native': {
            singleton: true,
            eager: true,
            requiredVersion: '0.84.1',
          },
          '@react-navigation/native': {
            singleton: true,
            eager: true,
            version: pkg.dependencies['@react-navigation/native'],
            requiredVersion: pkg.dependencies['@react-navigation/native'],
          },
          '@react-navigation/native-stack': {
            singleton: true,
            eager: true,
            version: pkg.dependencies['@react-navigation/native-stack'],
            requiredVersion: pkg.dependencies['@react-navigation/native-stack'],
          },
          'react-native-safe-area-context': {
            singleton: true,
            eager: true,
            version: pkg.dependencies['react-native-safe-area-context'],
            requiredVersion: pkg.dependencies['react-native-safe-area-context'],
          },
          'react-native-screens': {
            singleton: true,
            eager: true,
            version: pkg.dependencies['react-native-screens'],
            requiredVersion: pkg.dependencies['react-native-screens'],
          },
          '@react-native-async-storage/async-storage': {
            singleton: true,
            eager: true,
            version:
              pkg.dependencies['@react-native-async-storage/async-storage'],
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
