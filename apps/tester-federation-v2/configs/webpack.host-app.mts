// @ts-check
import * as Repack from '@callstack/repack';
import reactNativePkg from 'react-native/package.json' with { type: 'json' };
import reactPkg from 'react/package.json' with { type: 'json' };
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
            version: reactPkg.version,
            requiredVersion: reactPkg.version,
          },
          'react-native': {
            singleton: true,
            eager: true,
            version: reactNativePkg.version,
            requiredVersion: reactNativePkg.version,
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
        },
      }),
      // silence missing @react-native-masked-view optionally required by @react-navigation/elements
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
      new webpack.DefinePlugin({
        __WITH_PRELOAD__:
          process.env.WITH_PRELOAD === 'true' ||
          process.env.WITH_PRELOAD === '1',
      }),
    ],
  };
});
