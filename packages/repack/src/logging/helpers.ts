import type { LogEntry, LogType, Reporter } from './types.js';

export function makeLogEntryFromFastifyLog(data: any): LogEntry {
  const { level, time, pid, hostname, ...rest } = data;

  const levelToTypeMapping: Record<number, LogType> = {
    10: 'debug',
    20: 'debug',
    30: 'info',
    40: 'warn',
    50: 'error',
    60: 'error',
  };

  return {
    type: levelToTypeMapping[level],
    timestamp: time,
    issuer: '',
    message: [rest],
  };
}

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
