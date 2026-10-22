import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as Repack from '@callstack/repack';
import { withRepackDevTools } from '@callstack/repack-devtools-plugin/bundler';

import rspackConfig from './configs/rspack.mini-app.mts';
import webpackConfig from './configs/webpack.mini-app.mts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const useWebpack = Boolean(process.env.USE_WEBPACK);

const config = (env: Repack.EnvOptions) => {
  env.context = __dirname;

  return useWebpack ? webpackConfig(env) : rspackConfig(env);
};

// Exposes /repack-devtools/state on the remote's dev server too, so chunk 404s
// and compilation errors of the mini app can be inspected.
export default withRepackDevTools(config, {
  enabled: process.env.WITH_ROZENITE === 'true',
});
