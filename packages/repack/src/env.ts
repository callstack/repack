export const WORKER_ENV_KEY = 'RNWT_WORKER';

export const VERBOSE_ENV_KEY = 'RNWT_VERBOSE';

export const CLI_OPTIONS_ENV_KEY = 'RNWT_CLI_OPTIONS';

/**
 * Checks if code is running as a worker.
 *
 * @returns True if running as a worker.
 *
 * @internal
 */
export function isWorker() {
  return Boolean(process.env[WORKER_ENV_KEY]);
}

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
