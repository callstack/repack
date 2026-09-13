import * as Repack from '@callstack/repack';

export default Repack.defineRspackConfig((env) => {
  const { mode, context, platform } = env;

  return {
    mode,
    context,
    entry: './src/mini/index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
    },
    output: {
      path: '[context]/build/expo-host-widget/[platform]',
      uniqueName: 'MF2Tester-ExpoHostWidget',
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
            outputPath: `build/expo-host-widget/${platform}/output-remote`,
          },
        ],
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'OrdinaryWidget',
        filename: 'OrdinaryWidget.container.js.bundle',
        exposes: {
          './Widget': './src/mini/components/ExpoHostWidget',
        },
        dts: false,
        shared: {
          react: {
            singleton: true,
            eager: false,
            import: false,
            requiredVersion: false,
          },
          'react-native': {
            singleton: true,
            eager: false,
            import: false,
            requiredVersion: false,
          },
        },
      }),
    ],
  };
});
