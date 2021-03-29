import { DevServerConfig } from '../../server';

/** {@link getPublicPath} options. */
export interface GetPublicPathOptions
  extends Pick<DevServerConfig, 'host' | 'https'> {
  /** Whether the development server is enabled. */
  devServerEnabled?: boolean;
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
export function getPublicPath(options: GetPublicPathOptions) {
  const { port, host = 'localhost', https, devServerEnabled } = options;

  if (devServerEnabled) {
    return `${https ? 'https' : 'http'}://${host}:${port}/`;
  } else {
    return `file:///`;
  }
}
