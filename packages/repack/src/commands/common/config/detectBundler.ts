import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_RSPACK_CONFIG_LOCATIONS,
  DEFAULT_WEBPACK_CONFIG_LOCATIONS,
} from '../../consts.js';
import type { Bundler } from '../../types.js';

/**
 * Detects the bundler engine to use based on config file presence.
 *
 * Detection priority:
 * 1. Explicit `--bundler` flag (passed as `explicitBundler`)
 * 2. Custom config path filename inference (`rspack.*` vs `webpack.*`)
 * 3. Config file discovery (rspack configs checked first)
 * 4. Default: rspack
 */
export function detectBundler(
  rootDir: string,
  customConfigPath?: string,
  explicitBundler?: Bundler
): Bundler {
  if (explicitBundler) {
    return explicitBundler;
  }

  if (customConfigPath) {
    const basename = path.basename(customConfigPath);
    if (basename.startsWith('rspack')) {
      return 'rspack';
    }
    if (basename.startsWith('webpack')) {
      return 'webpack';
    }
  }

  for (const candidate of DEFAULT_RSPACK_CONFIG_LOCATIONS) {
    const filename = path.isAbsolute(candidate)
      ? candidate
      : path.join(rootDir, candidate);
    if (fs.existsSync(filename)) {
      return 'rspack';
    }
  }

  for (const candidate of DEFAULT_WEBPACK_CONFIG_LOCATIONS) {
    const filename = path.isAbsolute(candidate)
      ? candidate
      : path.join(rootDir, candidate);
    if (fs.existsSync(filename)) {
      return 'webpack';
    }
  }

  return 'rspack';
}
