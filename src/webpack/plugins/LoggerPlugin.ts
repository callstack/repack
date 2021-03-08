import webpack from 'webpack';
import { Reporter } from '../../Reporter';
import { LogEntry, LogType, WebpackPlugin } from '../../types';

export type GenericFilter = Array<string | RegExp>;

export interface LoggerPluginConfig {
  compact?: boolean;
  output?: {
    console?: boolean;
    file?: string;
    listener?: (logEntry: LogEntry) => void;
  };
}

export class LoggerPlugin implements WebpackPlugin {
  private static SUPPORTED_TYPES: string[] = ['debug', 'info', 'warn', 'error'];

  private fileLogBuffer: string[] = [];
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
      if (this.config.compact) {
        const { time, errors, warnings } = stats.toJson({
          timings: true,
          errors: true,
          warnings: true,
        });

        let entires: Array<LogEntry | undefined> = [];
        if (errors?.length) {
          entires = [
            this.createEntry('LoggerPlugin', 'error', [
              'Failed to build bundle due to errors',
            ]),
            ...errors.map((error) =>
              this.createEntry('LoggerPlugin', 'error', [
                `Error in "${error.moduleName}": ${error.message}`,
              ])
            ),
          ];
        } else {
          entires = [
            this.createEntry('LoggerPlugin', 'info', [
              warnings?.length ? 'Bundle built with warnings' : 'Bundle built',
              { time },
            ]),
            ...(warnings?.map((warning) =>
              this.createEntry('LoggerPlugin', 'warn', [
                `Warning in "${warning.moduleName}": ${warning.message}`,
              ])
            ) ?? []),
          ];
        }

        for (const entry of entires.filter(Boolean) as LogEntry[]) {
          this.processEntry(entry);
        }
      } else {
        const statsEntry = this.createEntry('LoggerPlugin', 'info', [
          stats.toString('all'),
        ]);
        if (statsEntry) {
          this.processEntry(statsEntry);
        }
      }

      this.reporter.flushFileLogs();
      this.reporter.stop();
    });

    process.on('uncaughtException', (error) => {
      const errorEntry = this.createEntry('LoggerPlugin', 'error', [error]);
      if (errorEntry) {
        this.processEntry(errorEntry);
      }
      this.reporter.flushFileLogs();
      this.reporter.stop();
    });

    process.on('exit', () => {
      this.reporter.flushFileLogs();
      this.reporter.stop();
    });
  }
}
