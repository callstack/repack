import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as Repack from '@callstack/repack';

import rspackConfig from './configs/rspack.host-app.mts';
import webpackConfig from './configs/webpack.host-app.mts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const useWebpack = Boolean(process.env.USE_WEBPACK);

const config = (env: Repack.EnvOptions) => {
  env.context = __dirname;

  return useWebpack ? webpackConfig(env) : rspackConfig(env);
};

// Rozenite and the Re.Pack DevTools plugin are only loaded with
// WITH_ROZENITE=true (see CONTRIBUTING.md).
let exportedConfig = config;
if (process.env.WITH_ROZENITE === 'true') {
  const { withRozenite } = await import('@rozenite/repack');
  const { withRepackDevTools } = await import(
    '@callstack/repack-devtools-plugin/bundler'
  );
  exportedConfig = withRozenite(withRepackDevTools(config, { enabled: true }), {
    enabled: true,
  });
}

export default exportedConfig;
