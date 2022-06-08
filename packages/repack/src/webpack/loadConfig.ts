import webpack from 'webpack';
import { WebpackEnvOptions } from '../types';

type WebpackConfig =
  | webpack.Configuration
  | ((
      env: WebpackEnvOptions,
      argv: Record<string, any>
    ) => webpack.Configuration | Promise<webpack.Configuration>);

export async function loadConfig(
  webpackConfigPath: string,
  env: WebpackEnvOptions
) {
  let config: WebpackConfig;

  try {
    config = require(webpackConfigPath);
  } catch {
    config = await import(webpackConfigPath);
  }

  if (typeof config === 'function') {
    return await config(env, {});
  }

  return config;
}
