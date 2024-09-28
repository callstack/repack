import baseConfig from '../rspack.config.mjs';

export default (env) => {
  const config = baseConfig(env);
  return {
    ...config,
    output: {
      ...config.output,
      path: process.env.TEST_WEBPACK_OUTPUT_DIR,
    },
  };
};
