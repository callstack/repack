// @ts-check
import * as Repack from '@callstack/repack';
import { NativeWindPlugin } from '@callstack/repack-plugin-nativewind';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import webpack from 'webpack';

import { buildHostAssetRules } from './hostAssetRules.mts';
import { buildSharedSingletons } from './sharedSingletons.mts';

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
        ...buildHostAssetRules(context!),
      ],
    },
    plugins: [
      new NativeWindPlugin({
        cssInteropOptions: { inlineRem: 16 },
      }),
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /^host-async-local$/,
            type: 'local',
          },
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/host-app/${platform}/output-remote`,
          },
        ],
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'HostApp',
        filename: 'HostApp.container.js.bundle',
        remotes: {
          MiniApp: `MiniApp@http://localhost:8082/${platform}/mf-manifest.json`,
        },
        dts: false,
        shared: buildSharedSingletons(true),
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
      new ReanimatedPlugin({ unstable_disableTransform: true }),
    ],
  };
});
