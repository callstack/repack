import type { LogEntry, Reporter } from '../types';

export interface BroadcastReporterConfig {}

export class BroadcastReporter implements Reporter {
  constructor(private config: BroadcastReporterConfig) {}

  process(_log: LogEntry) {
    // TODO
  }

  flush() {
    // TODO
  }

  stop() {
    // TODO
  }
}
