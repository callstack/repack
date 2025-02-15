// @ts-check
import path from 'node:path';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';

const dirname = Repack.getDirname(import.meta.url);

/** @type {(env: import('@callstack/repack').EnvOptions) => import('@rspack/core').Configuration} */
export default (env) => {
  const {
    mode = 'development',
    context = dirname,
    platform = process.env.PLATFORM,
  } = env;

  if (!platform) {
    throw new Error('Missing platform');
  }

  return {
    mode,
    context,
    entry: './src/host/index.js',
    resolve: {
      ...Repack.getResolveOptions(),
    },
    output: {
      path: path.join(dirname, 'build/host-app/[platform]'),
      uniqueName: 'MF2Tester-HostApp',
    },
    module: {
      rules: [
        ...Repack.getJsTransformRules(),
        {
          test: Repack.getAssetExtensionsRegExp(),
          use: '@callstack/repack/assets-loader',
        },
      ],
    },
    plugins: [
      new Repack.RepackPlugin(),
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
            requiredVersion: '18.3.1',
          },
          'react-native': {
            singleton: true,
            eager: true,
            requiredVersion: '0.76.3',
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
            requiredVersion: '^4.14.0',
          },
          'react-native-screens': {
            singleton: true,
            eager: true,
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
