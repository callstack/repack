import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as Repack from '@callstack/repack';
import { withRozenite } from '@rozenite/repack';

import rspackConfig from './configs/rspack.host-app.mts';
import webpackConfig from './configs/webpack.host-app.mts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const useWebpack = Boolean(process.env.USE_WEBPACK);

const config = (env: Repack.EnvOptions) => {
  env.context = __dirname;

  return useWebpack ? webpackConfig(env) : rspackConfig(env);
};

export default withRozenite(config, {
  enabled: process.env.WITH_ROZENITE === 'true',
});
