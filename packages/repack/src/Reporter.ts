import util from 'util';
import fs from 'fs';
import ora, { Ora } from 'ora';
import colorette from 'colorette';
import { LogEntry, LogType } from './types';
import { isVerbose, isWorker } from './env';
import { WebSocketEventsServer } from './server';
import { WebSocketDashboardServer } from './server/ws/WebSocketDashboardServer';

const IS_SYMBOL_SUPPORTED =
  process.platform !== 'win32' ||
  process.env.CI ||
  process.env.TERM === 'xterm-256color';

const SYMBOLS: Record<LogType, string> = {
  debug: colorette.gray('?'),
  info: colorette.blue('ℹ'),
  warn: colorette.yellow('⚠'),
  error: colorette.red('✖'),
};

const FALLBACK_SYMBOLS: Record<LogType, string> = {
  debug: colorette.gray('?'),
  info: colorette.blue('i'),
  warn: colorette.yellow('!'),
  error: colorette.red('x'),
};

interface ReqLogData {
  method: string;
  url: string;
}

interface ResLogData {
  statusCode: number;
}

/**
 * {@link Reporter} configuration options.
 */
export interface ReporterConfig {
  /** Whether to log additional debug messages. */
  verbose?: boolean;
  wsEventsServer?: WebSocketEventsServer;
  wsDashboardServer?: WebSocketDashboardServer;
}

/**
 * Class that handles all reporting, logging and compilation progress handling.
 */
export class Reporter {
  /**
   * Get message symbol for given log type.
   *
   * @param logType Log type.
   * @returns String with the symbol.
   *
   * @internal
   */
  static getSymbolForType(logType: LogType) {
    if (IS_SYMBOL_SUPPORTED) {
      return SYMBOLS[logType];
    }

    return FALLBACK_SYMBOLS[logType];
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
  static colorizeText(logType: LogType, text: string) {
    if (logType === 'warn') {
      return colorette.yellow(text);
    } else if (logType === 'error') {
      return colorette.red(text);
    }

    return text;
  }

  /** Whether reporter is running as a worker. */
  public readonly isWorker: boolean;
  /** Whether reporter is running in verbose mode. */
  public readonly isVerbose: boolean;

  private ora?: Ora;
  private requestBuffer: Record<number, ReqLogData | undefined> = {};
  private fileLogBuffer: string[] = [];
  private outputFilename?: string;
  private progress: Record<string, { value: number; label: string }> = {};
  private logBuffer: LogEntry[] = [];

  /**
   * Create new instance of Reporter.
   * If Reporter is running as a non-worker, it will start outputting to terminal.
   *
   * @param config Reporter configuration. Defaults to empty object.
   */
  constructor(private config: ReporterConfig = {}) {
    this.isWorker = isWorker();
    this.isVerbose = this.config.verbose ?? isVerbose();
    if (!this.isWorker) {
      this.ora = ora('Running...').start();
    }
  }

  /**
   * Get buffered server logs.
   *
   * @returns Array of server log entries.
   */
  getLogBuffer(): LogEntry[] {
    return this.logBuffer;
  }

  /**
   * Stop reporting and perform cleanup.
   */
  stop() {
    if (!this.isWorker && this.ora) {
      this.ora.stop();
    }
  }

  /**
   * Enable reporting to file alongside reporting to terminal.
   *
   * @param filename Absolute path to file to which write logs.
   */
  enableFileLogging(filename: string) {
    this.outputFilename = filename;
  }

  /**
   * Flush all buffered logs to a file provided that file
   * reporting was enabled with {@link enableFileLogging}.
   */
  flushFileLogs() {
    if (this.outputFilename) {
      fs.writeFileSync(this.outputFilename, this.fileLogBuffer.join('\n'));
      this.fileLogBuffer = [];
    }
  }

  /**
   * Process new log entry and report it to terminal and file if file reporting was enabled with
   * {@link enableFileLogging}.
   *
   * @param logEntry Log entry to process & report.
   */
  process(logEntry: LogEntry) {
    if (this.outputFilename) {
      this.fileLogBuffer.push(JSON.stringify(logEntry));
    }

    let shouldReport = logEntry.type !== 'debug' || this.isVerbose;
    // Allow to skip broadcasting messages - e.g. if broadcasting fails we don't want to try
    // to broadcast the failure as there's a high change it will fail again and cause infinite loop.
    const shouldBroadcast = !logEntry.message?.[0]?._skipBroadcast;

    // When reporter is running inside worker, simply stringify the entry
    // and use console to log it to stdout. It will be later caught by DevSeverProxy.
    if (this.isWorker) {
      console.log(JSON.stringify(logEntry));
    } else {
      if (this.isProgress(logEntry)) {
        const {
          progress: { value, label, platform },
        } = logEntry.message[0] as {
          progress: { value: number; label: string; platform: string };
        };
        this.progress[platform] = { value, label };
        this.updateProgress();

        this.config.wsDashboardServer?.send(
          JSON.stringify({ kind: 'progress', value, label, platform })
        );
      } else {
        const transformedLogEntry = this.transformLogEntry(logEntry);
        // Ignore empty logs
        if (transformedLogEntry) {
          if (shouldBroadcast) {
            this.config.wsEventsServer?.broadcastEvent({
              type: `repack_${transformedLogEntry.type}`,
              data: [
                transformedLogEntry.issuer,
                ...transformedLogEntry.message,
              ],
            });
          }

          // Disable route logging if not verbose. It would be better to do it on per-router/Fastify
          // level but unless webpack-dev-middleware is migrated to Fastify that's not a feasible solution.
          // TODO: silence route logs on per-router/Fastify
          if (transformedLogEntry.message[0].request && !this.isVerbose) {
            shouldReport = false;
          }

          if (shouldReport) {
            this.logBuffer = this.logBuffer.concat(logEntry).slice(-500);
            this.config.wsDashboardServer?.send(
              JSON.stringify({ kind: 'server-log', log: logEntry })
            );
          }

          const text = this.getOutputLogMessage(transformedLogEntry);
          if (shouldReport && this.ora) {
            this.ora.stopAndPersist({
              symbol: Reporter.getSymbolForType(logEntry.type),
              text,
            });
            this.ora.start('Running...');
          }
        }
      }
    }
  }

  private updateProgress() {
    let text = 'Running: ';
    for (const platform in this.progress) {
      const { value, label } = this.progress[platform];
      text += `(${platform}) ${label} ${Math.round(value * 100)}% `;
    }
    this.ora?.start(text);
  }

  private isProgress(logEntry: LogEntry) {
    return Boolean(logEntry.message?.[0]?.progress);
  }

  private transformLogEntry(logEntry: LogEntry): LogEntry | undefined {
    const message = [];
    let issuer = logEntry.issuer;
    for (const value of logEntry.message) {
      if (typeof value === 'string') {
        message.push(value);
      } else {
        const {
          msg,
          req,
          reqId,
          res,
          responseTime, // eslint-disable-line @typescript-eslint/no-unused-vars
          issuer: issuerOverride,
          ...rest
        } = value as {
          msg?: string | string[];
          req?: ReqLogData;
          reqId?: number;
          res?: ResLogData;
          responseTime?: number;
          issuer?: string;
          [key: string]: any; // For all unknown fields
        };

        if (issuerOverride) {
          issuer = issuerOverride;
        }

        // Route logs from Fastify (DevServerProxy, DevServer)
        if ((req || res) && reqId !== undefined) {
          if (req) {
            this.requestBuffer[reqId] = req;
            // Logs in the future should have a `res` with the same `reqId`, so we will be
            // able to match it. For now process next value.
            continue;
          }

          if (res) {
            const bufferedReq = this.requestBuffer[reqId];
            if (bufferedReq) {
              message.push({
                request: {
                  statusCode: res.statusCode,
                  method: bufferedReq.method,
                  url: bufferedReq.url,
                },
              });
              // Ignore msg/other data and process next value
              continue;
            } else {
              // Ignore and process next value
              continue;
            }
          }
        }

        // Usually non-route logs from Fastify (DevServerProxy, DevServer will have a `msg` field)
        if (msg) {
          message.push(...(Array.isArray(msg) ? msg : [msg]));
        }

        if (Object.keys(rest).length) {
          message.push(rest);
        }
      }
    }

    // Ignore empty logs
    if (!message.length) {
      return undefined;
    }

    return {
      timestamp: logEntry.timestamp,
      type: logEntry.type,
      issuer,
      message,
    };
  }

  private getOutputLogMessage(logEntry: LogEntry): string {
    let body = '';
    for (const value of logEntry.message) {
      if (typeof value === 'string') {
        body += Reporter.colorizeText(logEntry.type, value);
        body += ' ';
      } else {
        const { request, ...rest } = value as {
          request?: { method: string; statusCode: number; url: string };
          [key: string]: any; // For all unknown fields
        };

        if (request) {
          let rawStatus = `${request.method} ${request.statusCode}`;
          let status = colorette.green(rawStatus);
          if (request.statusCode >= 500) {
            status = colorette.red(rawStatus);
          } else if (request.statusCode >= 400) {
            status = colorette.yellow(rawStatus);
          }

          body += `${status} ${colorette.gray(request.url)}`;
          body += ' ';
        }

        if (Object.keys(rest).length) {
          body +=
            util.inspect(rest, {
              colors: true,
              depth: 3,
            }) + ' ';
        }
      }
    }

    return (
      colorette.gray(
        `[${new Date(logEntry.timestamp).toISOString().split('T')[1]}]`
      ) +
      colorette.bold(`[${logEntry.issuer}]`) +
      ` ${body}`
    );
  }
}
