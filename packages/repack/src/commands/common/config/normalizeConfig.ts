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

export function normalizeConfig<C extends ConfigurationObject>(
  config: C,
  platform: string
): C {
  /* normalize compiler name to be equal to platform */
  config.name = platform;

  /* normalize dev server host by resolving special values */
  if (config.devServer) {
    config.devServer.host = normalizeDevServerHost(config.devServer.host);
  }

  /* normalize output path by resolving [platform] & [context] placeholders */
  if (config.output?.path) {
    config.output.path = normalizeOutputPath(
      config.output.path,
      config.context ?? process.cwd(),
      config.name
    );
  }

  /* unset public path if it's using the deprecated `getPublicPath` function */
  if (config.output?.publicPath === 'DEPRECATED_GET_PUBLIC_PATH') {
    config.output.publicPath = undefined;
  }

  /* return the normalized config object */
  return config;
}
