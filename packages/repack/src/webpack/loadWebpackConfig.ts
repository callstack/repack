import webpack from 'webpack';
import { WebpackEnvOptions } from '../types';

type WebpackConfig =
  | webpack.Configuration
  | ((
      env: WebpackEnvOptions,
      argv: Record<string, any>
    ) => webpack.Configuration | Promise<webpack.Configuration>);

export async function loadWebpackConfig(
  webpackConfigPath: string,
  env: WebpackEnvOptions
): Promise<webpack.Configuration> {
  let config: WebpackConfig;

  try {
    config = require(webpackConfigPath);
  } catch {
    config = await import(webpackConfigPath);
  }

  if ('default' in config) {
    config = (config as { default: WebpackConfig }).default;
  }

  if (typeof config === 'function') {
    return await config(env, {});
  }

  return config;
}
