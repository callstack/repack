import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as Repack from '@callstack/repack';
import rspackConfig from './configs/rspack.expo-host-widget.mts';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default (env: Repack.EnvOptions) => {
  env.context = projectRoot;
  return rspackConfig(env);
};
