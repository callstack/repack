// @ts-check
import path from 'node:path';
import * as Repack from '@callstack/repack';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
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

  /** @type {import('@rspack/core').Configuration} */
  const config = {
    mode,
    context,
    entry: './src/host/index.js',
    resolve: {
      ...Repack.getResolveOptions(),
    },
    output: {
      path: path.join(dirname, 'build/host-app/[platform]'),
      uniqueName: 'MFTester-HostApp',
    },
    module: {
      rules: [
        Repack.REACT_NATIVE_LOADING_RULES,
        Repack.NODE_MODULES_LOADING_RULES,
        Repack.FLOW_TYPED_MODULES_LOADING_RULES,
        {
          test: /\.[jt]sx?$/,
          type: 'javascript/auto',
          exclude: [/node_modules/],
          use: {
            loader: 'builtin:swc-loader',
            options: {
              env: {
                targets: { 'react-native': '0.74' },
              },
              jsc: {
                assumptions: {
                  setPublicClassFields: true,
                  privateFieldsAsProperties: true,
                },
                externalHelpers: true,
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
              },
            },
          },
        },
        {
          test: Repack.getAssetExtensionsRegExp(),
          use: '@callstack/repack/assets-loader',
        },
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/host-app/${platform}/output-remote`,
          },
        ],
      }),
      new Repack.plugins.ModuleFederationPluginV1({
        name: 'HostApp',
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
          '@react-native-async-storage/async-storage': {
            singleton: true,
            eager: true,
            requiredVersion: '2.1.1',
          },
        },
      }),
      new rspack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
      new rspack.EnvironmentPlugin({
        MF_CACHE: null,
      }),
    ],
  };

  if (process.env.RSDOCTOR) {
    config.plugins?.push(new RsdoctorRspackPlugin());
  }

  return config;
};
