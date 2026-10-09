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
  '@react-native-async-storage/async-storage',
];

export default Repack.defineWebpackConfig((env) => {
  const { mode, context, platform } = env;

  return {
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
          use: '@callstack/repack/babel-swc-loader',
          type: 'javascript/auto',
        },
        ...Repack.getAssetTransformRules({ inline: true }),
      ],
    },
    plugins: [
      // @ts-expect-error
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/mini-app/${platform}/output-remote`,
          },
        ],
      }),
      // @ts-expect-error
      new Repack.plugins.ModuleFederationPluginV1({
        name: 'MiniApp',
        filename: 'MiniApp.container.bundle',
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
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
    ],
  };
});
