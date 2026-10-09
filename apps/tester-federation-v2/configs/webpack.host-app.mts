// @ts-check
import * as Repack from '@callstack/repack';
import webpack from 'webpack';

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
];

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
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'HostApp',
        filename: 'HostApp.container.js.bundle',
        remotes: {
          MiniApp: `MiniApp@http://localhost:8082/${platform}/mf-manifest.json`,
        },
        dts: false,
        shared: Repack.defineShared(SHARED_DEPS, {
          context,
          role: 'host',
        }),
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
