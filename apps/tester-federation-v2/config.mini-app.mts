import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as Repack from '@callstack/repack';

import rspackConfig from './configs/rspack.mini-app.mts';
import webpackConfig from './configs/webpack.mini-app.mts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const useWebpack = Boolean(process.env.USE_WEBPACK);

const config = (env: Repack.EnvOptions) => {
  env.context = __dirname;

  return useWebpack ? webpackConfig(env) : rspackConfig(env);
};

// With WITH_ROZENITE=true, exposes /repack-devtools/state on the remote's dev
// server too, so chunk 404s and compilation errors of the mini app can be
// inspected (see CONTRIBUTING.md).
let exportedConfig = config;
if (process.env.WITH_ROZENITE === 'true') {
  const { withRepackDevTools } = await import(
    '@callstack/repack-devtools-plugin/bundler'
  );
  exportedConfig = withRepackDevTools(config, { enabled: true });
}

export default exportedConfig;
