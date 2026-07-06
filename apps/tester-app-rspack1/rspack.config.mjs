import * as Repack from '@callstack/repack';

const dirname = Repack.getDirname(import.meta.url);

export default Repack.defineRspackConfig((env) => {
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
    entry: './index.js',
    resolve: {
      ...Repack.getResolveOptions(),
    },
    output: {
      uniqueName: 'tester-app-rspack1',
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
        {
          test: Repack.getAssetExtensionsRegExp(Repack.ASSET_EXTENSIONS),
          use: '@callstack/repack/assets-loader',
        },
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        // keep every async chunk on the filesystem so release builds work
        // without a remote server
        extraChunks: [{ include: /.*/, type: 'local' }],
      }),
    ],
  };
});
