import { DevServerConfig } from '../../server';

/** {@link getPublicPath} options. */
export interface GetPublicPathOptions
  extends Pick<DevServerConfig, 'port' | 'host' | 'https'> {
  /** Whether the development server is enabled. */
  devServerEnabled?: boolean;
}

/**
 * Get Webpack's public path.
 *
 * @param options Options object.
 * @returns Value for Webpack's `output.publicPath` option.
 */
export function getPublicPath(options: GetPublicPathOptions) {
  const { port, host = 'localhost', https, devServerEnabled } = options;

  if (devServerEnabled) {
    return `${https ? 'https' : 'http'}://${host}:${port}/`;
  } else {
    return `file:///`;
  }
}
