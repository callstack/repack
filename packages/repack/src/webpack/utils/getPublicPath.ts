//@ts-ignore
import { DevServerConfig } from '../../server';// eslint-disable-line

/** {@link getPublicPath} options. */
export interface GetPublicPathOptions
  extends Pick<DevServerConfig, 'enabled' | 'host' | 'https'> {
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
  const { port, host = 'localhost', https, enabled } = options;

  if (enabled) {
    return `${https ? 'https' : 'http'}://${host}:${port}/`;
  } else {
    return `noop:///`;
  }
}
