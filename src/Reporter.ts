import util from 'util';
import fs from 'fs';
import ora, { Ora } from 'ora';
import colorette from 'colorette';
import { LogEntry, LogType } from './types';
import { isVerbose, isWorker } from './env';

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

export interface ReporterConfig {
  verbose?: boolean;
}

export class Reporter {
  static getSymbolForType(logType: LogType) {
    if (IS_SYMBOL_SUPPORTED) {
      return SYMBOLS[logType];
    }

    return FALLBACK_SYMBOLS[logType];
  }

  static colorizeText(logType: LogType, text: string) {
    if (logType === 'warn') {
      return colorette.yellow(text);
    } else if (logType === 'error') {
      return colorette.red(text);
    }

    return text;
  }

  public readonly isWorker: boolean;
  public readonly isVerbose: boolean;

  private ora?: Ora;
  private requestBuffer: Record<number, ReqLogData | undefined> = {};
  private fileLogBuffer: string[] = [];
  private outputFilename?: string;

  constructor(private config: ReporterConfig = {}) {
    this.isWorker = isWorker();
    this.isVerbose = isVerbose();
    if (!this.isWorker) {
      this.ora = ora('Running...').start();
    }
  }

  enableFileLogging(filename: string) {
    this.outputFilename = filename;
  }

  flushFileLogs() {
    if (this.outputFilename) {
      fs.writeFileSync(this.outputFilename, this.fileLogBuffer.join('\n'));
      this.fileLogBuffer = [];
    }
  }

  process(logEntry: LogEntry) {
    if (this.outputFilename) {
      this.fileLogBuffer.push(JSON.stringify(logEntry));
    }

    // Skip debug logs if not in verbose mode
    if (logEntry.type === 'debug' && !this.isVerbose) {
      return;
    }

    // When reporter is running inside worker, simply stringify the entry
    // and use console to log it to stdout. It will be later caught by DevSeverProxy.
    if (this.isWorker) {
      console.log(JSON.stringify(logEntry));
    } else if (this.ora) {
      const text = this.getOutputLogMessage(logEntry);
      // Ignore empty logs
      if (text) {
        this.ora.stopAndPersist({
          symbol: Reporter.getSymbolForType(logEntry.type),
          text: this.getOutputLogMessage(logEntry),
        });
        this.ora.start('Running...');
      }
    }
  }

  private getOutputLogMessage(logEntry: LogEntry) {
    let body = '';
    for (const value of logEntry.message) {
      if (typeof value === 'string') {
        body += Reporter.colorizeText(logEntry.type, value);
        body += ' ';
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { msg, req, reqId, res, responseTime, ...rest } = value as {
          msg?: string;
          req?: ReqLogData;
          reqId?: number;
          res?: ResLogData;
          responseTime?: number;
          [key: string]: any; // For all unknown fields
        };

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
              let rawStatus = `${bufferedReq.method} ${res.statusCode}`;
              let status = colorette.green(rawStatus);
              if (res.statusCode >= 500) {
                status = colorette.red(rawStatus);
              } else if (res.statusCode >= 400) {
                status = colorette.yellow(rawStatus);
              }

              body += `${status} ${colorette.gray(bufferedReq.url)}`;
              body += ' ';
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
          body += Reporter.colorizeText(logEntry.type, msg);
          body += ' ';
        }

        if (Object.keys(rest).length) {
          body +=
            util.inspect(rest, {
              colors: true,
              maxArrayLength: Infinity,
              depth: null,
            }) + ' ';
        }
      }
    }

    // Ignore empty logs
    if (!body) {
      return undefined;
    }

    return (
      colorette.gray(`[${new Date(logEntry.timestamp).toISOString()}]`) +
      colorette.bold(`[${logEntry.issuer}]`) +
      ` ${body}`
    );
  }
}
