// @ts-check
import * as Repack from '@callstack/repack';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import rspack from '@rspack/core';

/** @type {(env: import('@callstack/repack').EnvOptions) => import('@rspack/core').Configuration} */
export default (env) => {
  const { mode, context, platform } = env;

  /** @type {import('@rspack/core').Configuration} */
  const config = {
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
        ...Repack.getJsTransformRules(),
        ...Repack.getAssetTransformRules(),
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
            requiredVersion: '19.1.0',
          },
          'react-native': {
            singleton: true,
            eager: true,
            requiredVersion: '0.80.0',
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
            requiredVersion: '^5.4.0',
          },
          'react-native-screens': {
            singleton: true,
            eager: true,
            requiredVersion: '^4.10.0',
          },
          '@react-native-async-storage/async-storage': {
            singleton: true,
            eager: true,
            requiredVersion: '^2.1.2',
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
