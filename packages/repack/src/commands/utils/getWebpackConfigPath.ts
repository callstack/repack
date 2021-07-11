import path from 'path';
import fs from 'fs';

// Supports the same files as Webpack CLI.
const DEFAULT_WEBPACK_CONFIG_LOCATIONS = [
  'webpack.config.js',
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
      return filename;
    }
  }

  throw new Error('Cannot find Webpack configuration file');
}
