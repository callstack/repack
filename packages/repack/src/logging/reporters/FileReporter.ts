import fs from 'fs';
import type { LogEntry, Reporter } from '../types';

export interface FileReporterConfig {
  filename: string;
}

export class FileReporter implements Reporter {
  private buffer: string[] = [];

  constructor(private config: FileReporterConfig) {}

  process(log: LogEntry) {
    this.buffer.push(JSON.stringify(log));
  }

  flush() {
    if (!this.buffer.length) {
      return;
    }

    fs.writeFileSync(this.config.filename, this.buffer.join('\n'));
    this.buffer = [];
  }

  stop() {
    this.flush();
  }
}
