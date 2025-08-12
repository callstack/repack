export default async (env) => {
  const { default: configFn } = await import('../../webpack.config.mjs');
  const config = configFn(env);

  return {
    ...config,
    cache: false,
    output: {
      ...config.output,
      path: process.env.TEST_WEBPACK_OUTPUT_DIR,
    },
  };
};
