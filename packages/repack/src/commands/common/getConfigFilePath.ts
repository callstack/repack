import path from 'path';
import fs from 'fs';
import Os from 'os';

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

export function getConfigFilePath(root: string, customPath?: string) {
  const candidates = customPath
    ? [customPath]
    : DEFAULT_WEBPACK_CONFIG_LOCATIONS;

  for (const candidate of candidates) {
    const filename = path.isAbsolute(candidate)
      ? candidate
      : path.join(root, candidate);
    if (fs.existsSync(filename)) {
      if (
        path.isAbsolute(candidate) &&
        candidate.endsWith('.mjs') &&
        Os.platform() === 'win32'
      ) {
        return `file:\\${filename}`;
      } else {
        return filename;
      }
    }
  }

  throw new Error('Cannot find Webpack configuration file');
}
