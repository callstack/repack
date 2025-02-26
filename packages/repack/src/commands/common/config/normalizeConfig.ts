import merge from 'webpack-merge';
import type { ConfigurationObject } from '../../types.js';

function normalizeDevServerHost(host?: string): string | undefined {
  switch (host) {
    case 'local-ip':
      return 'localhost';
    case 'local-ipv4':
      return '127.0.0.1';
    case 'local-ipv6':
      return '::1';
    default:
      return host;
  }
}

function normalizeOutputPath(
  outputPath: string,
  context: string,
  platform: string
): string {
  return outputPath
    .replaceAll('[context]', context)
    .replaceAll('[platform]', platform);
}

function normalizeResolveExtensions(
  extensions: string[],
  platform: string
): string[] {
  return extensions.map((ext) => ext.replaceAll('[platform]', platform));
}

export function normalizeConfig<C extends ConfigurationObject>(
  config: C,
  platform: string
): C {
  const normalizedConfig = {} as C;

  /* normalize compiler name to be equal to platform */
  normalizedConfig.name = platform;

  /* normalize dev server host by resolving special values */
  if (config.devServer) {
    normalizedConfig.devServer = {
      ...normalizedConfig.devServer,
      host: normalizeDevServerHost(config.devServer.host),
    };
  }

  /* normalize output path by resolving [platform] & [context] placeholders */
  if (config.output?.path) {
    normalizedConfig.output = {
      ...normalizedConfig.output,
      path: normalizeOutputPath(
        config.output.path,
        config.context ?? process.cwd(),
        platform
      ),
    };
  }

  /* unset public path if it's using the deprecated `getPublicPath` function */
  if (config.output?.publicPath === 'DEPRECATED_GET_PUBLIC_PATH') {
    normalizedConfig.output = {
      ...normalizedConfig.output,
      publicPath: undefined,
    };
  }

  /* normalize resolve extensions by resolving [platform] placeholder */
  if (config.resolve?.extensions) {
    normalizedConfig.resolve = {
      ...normalizedConfig.resolve,
      extensions: normalizeResolveExtensions(
        config.resolve.extensions,
        platform
      ),
    };
  }

  /* return the normalized config object */
  return merge(config, normalizedConfig);
}
