export default async (env) => {
  const config = (await import('../webpack.config.cjs')).default(env);
  return {
    ...config,
    output: {
      ...config.output,
      path: process.env.TEST_WEBPACK_OUTPUT_DIR,
    },
    experiments: {
      ...config.output.experiments,
      lazyCompilation: false,
    },
  };
};
