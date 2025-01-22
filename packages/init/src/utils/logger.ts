import { log } from '@clack/prompts';

let verbose = false;

const logger = {
  success: log.success,
  warn: log.warn,
  error: log.error,
  fatal: log.error,
  info: (message: string) => (verbose ? log.info(message) : undefined),
};

export default logger;

export function enableVerboseLogging() {
  verbose = true;
}
