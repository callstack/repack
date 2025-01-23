import { log } from '@clack/prompts';

let verbose = false;

type LogFn = (message: string) => void;

const verboseWrapper = (logFn: LogFn) => {
  return (message: string) => (verbose ? logFn(message) : undefined);
};

const logger = {
  error: verboseWrapper(log.error),
  info: verboseWrapper(log.info),
  success: verboseWrapper(log.success),
  warn: verboseWrapper(log.warn),
};

export default logger;

export function enableVerboseLogging() {
  verbose = true;
}
