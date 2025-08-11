export default async (env) => {
  const config = (await import('../../webpack.config.mjs')).default(env);
  return {
    ...config,
    cache: false,
    output: {
      ...config.output,
      path: process.env.TEST_WEBPACK_OUTPUT_DIR,
    },
    experiments: {
      ...config.experiments,
      lazyCompilation: false,
    },
  };
};
