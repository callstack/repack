import path from 'node:path';
import { fileURLToPath } from 'node:url';

import rspackConfig from './configs/rspack.host-app.mjs';
import webpackConfig from './configs/webpack.host-app.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const useWebpack = Boolean(process.env.USE_WEBPACK);

export default (env) => {
  env.context = __dirname;

  return useWebpack ? webpackConfig(env) : rspackConfig(env);
};
