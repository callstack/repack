import { LogEntry } from './types';

export class Reporter {
  constructor() {}

  process(logEntry: LogEntry) {
    console.log(JSON.stringify(logEntry));
  }
}
