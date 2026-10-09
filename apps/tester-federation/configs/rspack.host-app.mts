import * as Repack from '@callstack/repack';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import rspack from '@rspack/core';

// Shared dependencies are versionless here: defineShared pins every entry to
// the exact version installed in this workspace, so host and remotes always
// agree without hand-maintained literals.
const SHARED_DEPS = [
  'react',
  'react-native',
  '@react-navigation/native',
  '@react-navigation/native-stack',
  'react-native-safe-area-context',
  'react-native-screens',
  '@react-native-async-storage/async-storage',
];

export default Repack.defineRspackConfig((env) => {
  const { mode, context, platform } = env;

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
        {
          test: /\.[cm]?[jt]sx?$/,
          type: 'javascript/auto',
          use: {
            loader: '@callstack/repack/babel-swc-loader',
            parallel: true,
            options: {},
          },
        },
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
        shared: Repack.defineShared(SHARED_DEPS, {
          context,
          role: 'host',
        }),
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
    // @ts-expect-error
    config.plugins?.push(new RsdoctorRspackPlugin());
  }

  return config;
});
