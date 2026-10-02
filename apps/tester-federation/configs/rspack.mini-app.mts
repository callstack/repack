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
    entry: './src/mini/index.js',
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
        shared: Repack.defineShared(SHARED_DEPS, {
          context,
          role: 'remote',
          // `--standalone` is runtime-only (env.argv): never committed.
          mode: env.argv?.standalone ? 'standalone' : 'federated',
        }),
      }),
      new rspack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
    ],
  };

  if (process.env.RSDOCTOR) {
    // @ts-expect-error
    config.plugins?.push(new RsdoctorRspackPlugin());
  }

  return config;
});
