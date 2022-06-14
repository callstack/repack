import type { DevServerOptions } from '../../types';

/** {@link getPublicPath} options. */
export interface GetPublicPathOptions
  extends Pick<DevServerOptions, 'host' | 'https'> {
  /** Port under which to run the development server. */
  port?: number;
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
  if (options) {
    const { port, host = 'localhost', https } = options ?? {};
    return `${https ? 'https' : 'http'}://${host}:${port}/`;
  } else {
    return `noop:///`;
  }
}
