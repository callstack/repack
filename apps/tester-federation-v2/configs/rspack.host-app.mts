import { createRequire } from 'node:module';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';

import { buildSharedSingletons } from './sharedSingletons.mts';

const require = createRequire(import.meta.url);

export default Repack.defineRspackConfig((env) => {
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
          use: {
            loader: '@callstack/repack/babel-swc-loader',
            parallel: true,
            options: {},
          },
          type: 'javascript/auto',
        },
        ...Repack.getAssetTransformRules({
          inline: true,
          maxInlineSize: 90 * 1024,
        }),
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
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'HostApp',
        // Records MF lifecycle events from container start-up; without it the
        // devtools register their runtime plugin from the app entry instead.
        runtimePlugins:
          mode === 'development' && process.env.WITH_ROZENITE === 'true'
            ? [
                require.resolve(
                  '@callstack/repack-devtools-plugin/mf-runtime-plugin'
                ),
              ]
            : [],
        filename: 'HostApp.container.js.bundle',
        remotes: {
          MiniApp: `MiniApp@http://localhost:8082/${platform}/mf-manifest.json`,
        },
        dts: false,
        shared: buildSharedSingletons(true),
      }),
      // silence missing @react-native-masked-view optionally required by @react-navigation/elements
      new rspack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
      new rspack.DefinePlugin({
        __WITH_ROZENITE__: process.env.WITH_ROZENITE === 'true',
        __WITH_PRELOAD__:
          process.env.WITH_PRELOAD === 'true' ||
          process.env.WITH_PRELOAD === '1',
      }),
    ],
  };
});
