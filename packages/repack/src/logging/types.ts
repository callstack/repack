export interface Reporter {
  process(log: LogEntry): void;
  flush(): void;
  stop(): void;
}

/** Log message type. */
export type LogType = 'debug' | 'info' | 'warn' | 'error';

/**
 * Represent log message with all necessary data.
 *
 * @internal
 */
export interface LogEntry {
  timestamp: number;
  type: LogType;
  issuer: string;
  message: Array<string | number | boolean | Object>;
}
