export const WORKER_ENV_KEY = 'HAUL_NEXT_WORKER';

export const VERBOSE_ENV_KEY = 'HAUL_NEXT_VERBOSE';

export function isWorker() {
  return Boolean(process.env[WORKER_ENV_KEY]);
}

export function isVerbose() {
  return Boolean(process.env[VERBOSE_ENV_KEY]);
}
