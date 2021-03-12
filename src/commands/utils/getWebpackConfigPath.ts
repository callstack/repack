import path from 'path';
import fs from 'fs';

export function getWebpackConfigPath(root: string) {
  // Supports the same files as Webpack CLI.
  const candidates = [
    'webpack.config.js',
    '.webpack/webpack.config.js',
    '.webpack/webpackfile',
  ];

  for (const candidate of candidates) {
    const filename = path.join(root, candidate);
    if (fs.existsSync(filename)) {
      return filename;
    }
  }

  throw new Error('Cannot find Webpack configuration file');
}
