import path from 'path';

export function getWebpackConfigPath(root: string) {
  // TODO: support other locations like in webpack-cli
  return path.join(root, 'webpack.config.js');
}
