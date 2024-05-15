export const VERBOSE_ENV_KEY = 'REPACK_VERBOSE';

/**
 * Default development server hostname.
 * Allows for listening for connections from all network interfaces.
 */
export const DEFAULT_HOSTNAME = 'localhost';

/** Default development server port. */
export const DEFAULT_PORT = 8081;

/**
 * Checks if code is running in verbose mode.
 *
 * @returns True if running in verbose mode.
 *
 * @internal
 */
export function isVerbose() {
  return Boolean(process.env[VERBOSE_ENV_KEY]);
}
