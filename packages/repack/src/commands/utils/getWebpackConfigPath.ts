import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import url from 'node:url';

// Supports the same files as Webpack CLI.
const DEFAULT_WEBPACK_CONFIG_LOCATIONS = [
  'webpack.config.mjs',
  'webpack.config.cjs',
  'webpack.config.js',
  '.webpack/webpack.config.mjs',
  '.webpack/webpack.config.cjs',
  '.webpack/webpack.config.js',
  '.webpack/webpackfile',
];

export function getWebpackConfigPath(root: string, customPath?: string) {
  const candidates = customPath
    ? [customPath]
    : DEFAULT_WEBPACK_CONFIG_LOCATIONS;

  for (const candidate of candidates) {
    const filename = path.isAbsolute(candidate)
      ? candidate
      : path.join(root, candidate);

    if (fs.existsSync(filename)) {
      if (path.extname(filename) === '.mjs' && os.platform() === 'win32') {
        return url.pathToFileURL(filename).href;
      } else {
        return filename;
      }
    }
  }

  throw new Error('Cannot find Webpack configuration file');
}
