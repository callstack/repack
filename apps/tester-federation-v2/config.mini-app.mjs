import rspackConfig from './configs/rspack.mini-app.mjs';
import webpackConfig from './configs/webpack.mini-app.mjs';

const useWebpack = Boolean(process.env.USE_WEBPACK);

export default (env) => {
  return useWebpack ? webpackConfig(env) : rspackConfig(env);
};
