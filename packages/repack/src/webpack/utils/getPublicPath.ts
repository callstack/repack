import type { DevServerOptions } from '../../types';

/** {@link getPublicPath} options. */
export interface GetPublicPathOptions {
  /** Target application platform. */
  platform: string;

  /** Development server configuration options. */
  devServer: Pick<DevServerOptions, 'port' | 'host' | 'https'>;
}

/**
 * Get Webpack's public path.
 *
 * @param options Options object.
 * @returns Value for Webpack's `output.publicPath` option.
 *
 * @category Webpack util
 */
export function getPublicPath(options?: GetPublicPathOptions) {
  if (options?.devServer) {
    const { port, host, https } = options.devServer;
    return `${https ? 'https' : 'http'}://${host || 'localhost'}:${port}/${
      options.platform
    }/`;
  } else {
    return `noop:///`;
  }
}
