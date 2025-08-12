import * as Repack from '@callstack/repack';

export default async (env) => {
  const { default: configFn } = await import('../rspack.config.mjs');
  const config = await configFn(env);

  return {
    ...config,
    mode: 'production',
    plugins: [
      ...(config.plugins || []),
      new Repack.plugins.HermesBytecodePlugin({
        enabled: true,
        test: /\.bundle(\?.*)?$/,
        exclude: /index\.bundle(\?.*)?$/,
      }),
      new Repack.plugins.CodeSigningPlugin({
        enabled: true,
        privateKeyPath: './code-signing.pem',
      }),
    ],
  };
};
