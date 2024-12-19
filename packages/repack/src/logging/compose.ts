import type { Reporter } from './types.js';

export function composeReporters(reporters: Reporter[]): Reporter {
  return {
    process: (logEntry) => {
      reporters.forEach((reporter) => reporter.process(logEntry));
    },
    flush: () => {
      reporters.forEach((reporter) => reporter.flush());
    },
    stop: () => {
      reporters.forEach((reporter) => reporter.stop());
    },
  };
}
