import { DEFAULT_HOSTNAME, DEFAULT_PORT } from '../../consts.js';

function getCacheConfig(bundler: 'rspack' | 'webpack') {
  if (bundler === 'rspack') {
    return {
      cache: true,
      experiments: { cache: { type: 'persistent' } },
    };
  }

  return { cache: { type: 'filesystem' } };
}

function getStartCommandDefaults(bundler: 'rspack' | 'webpack') {
  return {
    ...getCacheConfig(bundler),
    mode: 'development',
    devServer: {
      host: DEFAULT_HOSTNAME,
      port: DEFAULT_PORT,
      hot: true,
      server: 'http',
    },
    output: {
      publicPath: 'DEV_SERVER_PUBLIC_PATH',
    },
  };
}

function getBundleCommandDefaults() {
  return {
    mode: 'production',
    devServer: false,
    optimization: {
      minimize: true,
    },
  };
}

export function getCommandConfig(
  command: 'start' | 'bundle',
  bundler: 'rspack' | 'webpack'
) {
  if (command === 'start') {
    return getStartCommandDefaults(bundler);
  }

  if (command === 'bundle') {
    return getBundleCommandDefaults();
  }

  throw new Error(`Unknown command: ${command}`);
}
