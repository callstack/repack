import rspackConfig from './configs/rspack.host-app.mjs';
import webpackConfig from './configs/webpack.host-app.mjs';

const useWebpack = Boolean(process.env.USE_WEBPACK);

export default (env) => {
  return useWebpack ? webpackConfig(env) : rspackConfig(env);
};
