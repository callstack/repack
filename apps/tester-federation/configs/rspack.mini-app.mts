import * as Repack from '@callstack/repack';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import rspack from '@rspack/core';
import pkg from '../package.json' with { type: 'json' };

export default Repack.defineRspackConfig((env) => {
  const { mode, context, platform } = env;

  const config = {
    mode,
    context,
    entry: './src/mini/index.js',
    experiments: {
      parallelLoader: true,
    },
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
    },
    output: {
      path: '[context]/build/mini-app/[platform]',
      uniqueName: 'MFTester-MiniApp',
    },
    module: {
      rules: [
        {
          test: /\.[cm]?[jt]sx?$/,
          use: {
            loader: '@callstack/repack/babel-swc-loader',
            parallel: true,
            options: {},
          },
          type: 'javascript/auto',
        },
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
      new Repack.plugins.ModuleFederationPluginV1({
        name: 'MiniApp',
        exposes: {
          './MiniAppNavigator': './src/mini/navigation/MainNavigator',
        },
        shared: {
          react: {
            singleton: true,
            eager: false,
            requiredVersion: pkg.dependencies.react,
          },
          'react-native': {
            singleton: true,
            eager: false,
            requiredVersion: pkg.dependencies['react-native'],
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
          '@react-native-async-storage/async-storage': {
            singleton: true,
            eager: false,
            requiredVersion:
              pkg.dependencies['@react-native-async-storage/async-storage'],
          },
        },
      }),
      new rspack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
    ],
  };

  if (process.env.RSDOCTOR) {
    // @ts-ignore
    config.plugins?.push(new RsdoctorRspackPlugin());
  }

  return config;
});
