import util from 'node:util';
import * as colorette from 'colorette';
import throttle from 'throttleit';
import type { LogEntry, LogType, Reporter } from '../types.js';

export interface ConsoleReporterConfig {
  asJson?: boolean;
  isVerbose?: boolean;
  isWorker?: boolean;
}

export class ConsoleReporter implements Reporter {
  private internalReporter: Reporter;

  constructor(private config: ConsoleReporterConfig) {
    this.internalReporter =
      this.config.isWorker || this.config.asJson
        ? new JsonConsoleReporter(this.config)
        : new InteractiveConsoleReporter(this.config);
  }

  process(log: LogEntry) {
    this.internalReporter.process(log);
  }

  flush() {
    this.internalReporter.flush();
  }

  stop() {
    this.internalReporter.stop();
  }
}

class JsonConsoleReporter implements Reporter {
  constructor(private config: ConsoleReporterConfig) {}

  process(log: LogEntry) {
    console.log(JSON.stringify(log));
  }

  flush() {
    // NOOP
  }

  stop() {
    // NOOP
  }
}

const IS_SYMBOL_SUPPORTED =
  process.platform !== 'win32' ||
  process.env.CI ||
  process.env.TERM === 'xterm-256color';

const SYMBOLS: Record<LogType, string> = {
  debug: colorette.gray('?'),
  info: colorette.blue('ℹ'),
  warn: colorette.yellow('⚠'),
  error: colorette.red('✖'),
  success: colorette.green('✔'),
  progress: colorette.green('⇢'),
};

const FALLBACK_SYMBOLS: Record<LogType, string> = {
  debug: colorette.gray('?'),
  info: colorette.blue('i'),
  warn: colorette.yellow('!'),
  error: colorette.red('x'),
  success: colorette.green('✓'),
  progress: colorette.green('->'),
};

class InteractiveConsoleReporter implements Reporter {
  private requestBuffer: Record<string, Object> = {};

  constructor(private config: ConsoleReporterConfig) {}

  process(log: LogEntry) {
    // Do not log debug messages in non-verbose mode
    if (log.type === 'debug' && !this.config.isVerbose) {
      return;
    }

    const [firstMessage] = log.message;
    if (typeof firstMessage === 'object' && 'progress' in firstMessage) {
      this.processProgress(log);
      return;
    }

    const normalizedLog = this.normalizeLog(log);
    if (normalizedLog) {
      process.stdout.write(
        `${
          IS_SYMBOL_SUPPORTED ? SYMBOLS[log.type] : FALLBACK_SYMBOLS[log.type]
        } ${this.prettifyLog(normalizedLog)}\n`
      );
    }
  }

  private normalizeLog(log: LogEntry): LogEntry | undefined {
    const message = [];
    let issuer = log.issuer;

    for (const value of log.message) {
      if (
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        typeof value === 'number'
      ) {
        message.push(value);
      } else if (
        'msg' in value &&
        (value as { msg: string }).msg === 'incoming request'
      ) {
        // Incoming dev server request
        const { reqId, req } = value as unknown as {
          reqId: string;
          req: Object;
        };
        // Save req object, so that we can extract data when request gets completed
        this.requestBuffer[reqId] = req;
      } else if (
        'msg' in value &&
        (value as { msg: string }).msg === 'request completed'
      ) {
        // Dev server response
        const { reqId, res, msg, ...rest } = value as {
          reqId: string;
          res: Object;
          msg: string | string[];
        };
        const bufferedReq = this.requestBuffer[reqId];
        if (bufferedReq) {
          message.push({
            request: {
              statusCode: (res as any).statusCode,
              method: (bufferedReq as any).method,
              url: (bufferedReq as any).url,
            },
          });
        }

        if (msg) {
          message.push(...(Array.isArray(msg) ? msg : [msg]));
        }

        if (Object.keys(rest).length) {
          message.push(rest);
        }
      } else if ('msg' in value) {
        const {
          msg,
          issuer: issuerOverride,
          ...rest
        } = value as { msg: string | string[]; issuer?: string };
        issuer = issuerOverride || issuer;
        message.push(...(Array.isArray(msg) ? msg : [msg]), rest);
      } else {
        message.push(value);
      }
    }

    // Ignore empty logs
    if (!message.length) {
      return undefined;
    }

    return {
      timestamp: log.timestamp,
      type: log.type,
      issuer,
      message,
    };
  }

  private processProgress = throttle((log: LogEntry) => {
    const {
      progress: { value, platform },
    } = log.message[0] as {
      progress: { value: number; platform: string };
    };

    const percentage = Math.floor(value * 100);

    process.stdout.write(
      `${
        IS_SYMBOL_SUPPORTED ? SYMBOLS.progress : FALLBACK_SYMBOLS.progress
      } ${this.prettifyLog({
        timestamp: log.timestamp,
        issuer: log.issuer,
        type: 'info',
        message: [`Compiling ${platform}: ${percentage}%`],
      })}\n`
    );
    // match rspack progressplugin throttle for now
  }, 200);

  private prettifyLog(log: LogEntry) {
    let body = '';

    for (const value of log.message) {
      if (
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        typeof value === 'number'
      ) {
        // Colorize and concat primitive values
        body += colorizeText(log.type, value.toString());
        body += ' ';
      } else if ('request' in value) {
        // Colorize and concat dev server req/res object
        const { request } = value as {
          request: { method: string; statusCode: number; url: string };
        };
        const statusText = `${request.method} ${request.statusCode}`;

        let status = colorette.green(statusText);
        if (request.statusCode >= 500) {
          status = colorette.red(statusText);
        } else if (request.statusCode >= 400) {
          status = colorette.yellow(statusText);
        }

        body += `${status} ${colorette.gray(request.url)}`;
        body += ' ';
      } else if (Object.keys(value).length) {
        // Colorize and concat generic object
        body +=
          util.inspect(value, {
            colors: true,
            depth: 3,
          }) + ' ';
      }
    }

    return (
      colorette.gray(
        `[${new Date(log.timestamp).toISOString().split('T')[1]}]`
      ) +
      colorette.bold(`[${log.issuer}]`) +
      ` ${body}`
    );
  }

  flush() {
    // NOOP
  }

  stop() {
    // NOOP
  }
}

/**
 * Apply ANSI colors to given text.
 *
 * @param logType Log type for the text, based on which different colors will be applied.
 * @param text Text to apply the color onto.
 * @returns Text wrapped in ANSI color sequences.
 *
 * @internal
 */
function colorizeText(logType: LogType, text: string) {
  if (logType === 'warn') {
    return colorette.yellow(text);
  }
  if (logType === 'error') {
    return colorette.red(text);
  }

  return text;
}
