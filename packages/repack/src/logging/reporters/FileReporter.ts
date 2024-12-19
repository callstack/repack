import fs from 'node:fs';
import path from 'node:path';
import throttle from 'throttleit';
import type { LogEntry, Reporter } from '../types.js';

export interface FileReporterConfig {
  filename: string;
}

export class FileReporter implements Reporter {
  private buffer: string[] = ['\n\n--- BEGINNING OF NEW LOG ---\n'];

  constructor(private config: FileReporterConfig) {
    if (!path.isAbsolute(this.config.filename)) {
      this.config.filename = path.join(process.cwd(), this.config.filename);
    }

    fs.mkdirSync(path.dirname(this.config.filename), { recursive: true });
  }

  throttledFlush: () => void = throttle(() => {
    this.flush();
  }, 1000);

  process(log: LogEntry) {
    this.buffer.push(JSON.stringify(log));
    this.throttledFlush();
  }

  flush() {
    if (!this.buffer.length) {
      return;
    }

    fs.writeFileSync(this.config.filename, this.buffer.join('\n'), {
      flag: 'a',
    });
    this.buffer = [];
  }

  stop() {
    this.flush();
  }
}
