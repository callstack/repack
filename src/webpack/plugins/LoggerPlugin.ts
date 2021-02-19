import util from 'util';
import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import { WebpackPlugin } from '../../types';

export type LogType = 'debug' | 'info' | 'warn' | 'error';

export type GenericFilter = Array<string | RegExp>;

export interface LogEntry {
  timestamp: number;
  type: LogType;
  issuer: string;
  message: any[];
}

export interface LoggerPluginConfig {
  json?: boolean;
  filter?: {
    type?: LogType[];
    issuer?: GenericFilter;
  };
  output?: {
    console?: boolean;
    file?: string;
    listener?: (logEntry: LogEntry) => void;
  };
}

export class LoggerPlugin implements WebpackPlugin {
  static SUPPORTED_TYPES: string[] = ['debug', 'info', 'warn', 'error'];
  static ERROR_ONLY: LogType[] = ['error'];
  static WARN_AND_ABOVE: LogType[] = ['warn', ...LoggerPlugin.ERROR_ONLY];
  static INFO_AND_ABOVE: LogType[] = ['info', ...LoggerPlugin.WARN_AND_ABOVE];
  static DEBUG_AND_ABOVE: LogType[] = ['debug', ...LoggerPlugin.INFO_AND_ABOVE];

  private fileLogBuffer: string[] = [];

  constructor(private config: LoggerPluginConfig = {}) {
    if (this.config.output === undefined) {
      this.config.output = { console: true };
    }
    if (this.config.filter === undefined) {
      this.config.filter = { type: LoggerPlugin.INFO_AND_ABOVE };
    }
  }

  createEntry(
    issuer: string,
    type: string,
    args: any[],
    timestamp?: number
  ): LogEntry | undefined {
    if (LoggerPlugin.SUPPORTED_TYPES.includes(type)) {
      return {
        timestamp: timestamp ?? Date.now(),
        issuer: issuer.includes('reactNativeAssetsLoader')
          ? 'reactNativeAssetsLoader'
          : issuer,
        type: type as LogType,
        message: args,
      };
    }

    return undefined;
  }

  shouldProcessEntry(entry: LogEntry): boolean {
    if (
      this.config.filter?.type &&
      !this.config.filter?.type.includes(entry.type)
    ) {
      return false;
    }

    if (
      this.config.filter?.issuer &&
      !this.config.filter?.issuer.some((pattern) =>
        typeof pattern === 'string'
          ? entry.issuer.includes(pattern)
          : pattern.test(entry.issuer)
      )
    ) {
      return false;
    }

    return true;
  }

  processEntry(entry: LogEntry) {
    if (
      !this.config.output?.console &&
      !this.config.output?.file &&
      !this.config.output?.listener
    ) {
      return;
    }

    if (this.config.output.console) {
      if (this.config.json) {
        console.log(entry);
      } else {
        console.log(
          `[${new Date(entry.timestamp).toISOString()}][${entry.issuer}] <${
            entry.type
          }>`,
          ...entry.message
        );
      }
    }

    if (this.config.output.file) {
      let data = '';
      if (this.config.json) {
        data = JSON.stringify(entry) + '\n';
      } else {
        data = `[${new Date(entry.timestamp).toISOString()}][${
          entry.issuer
        }] <${entry.type}> `;
        for (const value of entry.message) {
          if (typeof value === 'string') {
            data += value + ' ';
          } else {
            data +=
              util.inspect(value, {
                colors: false,
                maxArrayLength: Infinity,
                depth: null,
              }) + ' ';
          }
        }
      }
      this.fileLogBuffer.push(data);
    }

    if (this.config.output.listener) {
      this.config.output.listener(entry);
    }
  }

  apply(compiler: webpack.Compiler) {
    // Make sure webpack-cli doesn't print stats by default.
    compiler.options.stats = 'none';

    compiler.hooks.infrastructureLog.tap(
      'LoggerPlugin',
      (issuer, type, args) => {
        const entry = this.createEntry(issuer, type, args);
        if (entry && this.shouldProcessEntry(entry)) {
          this.processEntry(entry);
        }
        return true;
      }
    );

    compiler.hooks.thisCompilation.tap('LoggerPlugin', (compilation) => {
      compilation.hooks.log.intercept({
        call: (issuer, { time, type, args }) => {
          const entry = this.createEntry(issuer, type, args, time);
          if (entry && this.shouldProcessEntry(entry)) {
            this.processEntry(entry);
          }
        },
      });
    });

    compiler.hooks.done.tap('LoggerPlugin', (stats) => {
      const statsEntry = this.createEntry('LoggerPlugin', 'info', [
        stats.toString('all'),
      ]);
      if (statsEntry) {
        this.processEntry(statsEntry);
      }

      if (this.config.output?.file) {
        let resolvedOutputFile;
        if (path.isAbsolute(this.config.output.file)) {
          resolvedOutputFile = this.config.output.file;
        } else {
          resolvedOutputFile = path.join(
            compiler.options.output.path ?? process.cwd(),
            this.config.output.file
          );
        }

        fs.writeFileSync(resolvedOutputFile, this.fileLogBuffer.join('\n'));
        this.fileLogBuffer = [];
      }
    });
  }
}
