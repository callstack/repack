import path from 'path';
import webpack from 'webpack';
import { Reporter } from '../../Reporter';
import { LogEntry, LogType, WebpackPlugin } from '../../types';

export type GenericFilter = Array<string | RegExp>;

export interface LoggerPluginConfig {
  output?: {
    console?: boolean;
    file?: string;
    listener?: (logEntry: LogEntry) => void;
  };
}

export class LoggerPlugin implements WebpackPlugin {
  private static SUPPORTED_TYPES: string[] = ['debug', 'info', 'warn', 'error'];

  private fileLogBuffer: string[] = [];
  private resolvedOutputFile?: string;
  readonly reporter = new Reporter();

  constructor(private config: LoggerPluginConfig = {}) {
    if (this.config.output === undefined) {
      this.config.output = { console: true };
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

  processEntry(entry: LogEntry) {
    if (
      !this.config.output?.console &&
      !this.config.output?.file &&
      !this.config.output?.listener
    ) {
      return;
    }

    if (this.config.output.console) {
      this.reporter.process(entry);
    }

    if (this.config.output.file) {
      this.fileLogBuffer.push(JSON.stringify(entry));
    }

    if (this.config.output.listener) {
      this.config.output.listener(entry);
    }
  }

  apply(compiler: webpack.Compiler) {
    // Make sure webpack-cli doesn't print stats by default.
    compiler.options.stats = 'none';

    if (this.config.output?.file) {
      if (path.isAbsolute(this.config.output.file)) {
        this.resolvedOutputFile = this.config.output.file;
      } else {
        this.resolvedOutputFile = path.join(
          compiler.options.output.path ?? process.cwd(),
          this.config.output.file
        );
      }
    }

    compiler.hooks.infrastructureLog.tap(
      'LoggerPlugin',
      (issuer, type, args) => {
        const entry = this.createEntry(issuer, type, args);
        if (entry) {
          this.processEntry(entry);
        }
        return true;
      }
    );

    compiler.hooks.thisCompilation.tap('LoggerPlugin', (compilation) => {
      compilation.hooks.log.intercept({
        call: (issuer, { time, type, args }) => {
          const entry = this.createEntry(issuer, type, args, time);
          if (entry) {
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
      this.reporter.flushFileLogs();
    });

    process.on('uncaughtException', (error) => {
      const errorEntry = this.createEntry('LoggerPlugin', 'error', [error]);
      if (errorEntry) {
        this.processEntry(errorEntry);
      }
      this.reporter.flushFileLogs();
    });

    process.on('exit', () => {
      this.reporter.flushFileLogs();
    });
  }
}
