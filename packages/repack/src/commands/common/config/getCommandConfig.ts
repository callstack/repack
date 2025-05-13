import { EXPERIMENTAL_CACHE_ENV_KEY } from '../../../env.js';
import { DEFAULT_HOSTNAME, DEFAULT_PORT } from '../../consts.js';

function isExperimentalCacheEnabled() {
  return (
    process.env[EXPERIMENTAL_CACHE_ENV_KEY] === 'true' ||
    process.env[EXPERIMENTAL_CACHE_ENV_KEY] === '1'
  );
}

function getCacheConfig(bundler: 'rspack' | 'webpack') {
  if (isExperimentalCacheEnabled()) {
    if (bundler === 'rspack') {
      return {
        cache: true,
        experiments: { cache: { type: 'persistent' } },
      };
    }
    return { cache: { type: 'filesystem' } };
  }
  return {};
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
