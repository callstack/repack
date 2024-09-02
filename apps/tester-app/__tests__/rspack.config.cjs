const baseConfig = require('../rspack.config.cjs');

module.exports = (env) => {
  const config = baseConfig(env);
  return {
    ...config,
    output: {
      ...config.output,
      path: process.env.TEST_WEBPACK_OUTPUT_DIR,
    },
  };
};
