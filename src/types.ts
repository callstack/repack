import webpack from 'webpack';

/**
 * Represent interface of Webpack logger.
 * See: https://webpack.js.org/api/logging/
 */
export type WebpackLogger = ReturnType<
  webpack.Compiler['getInfrastructureLogger']
>;

/**
 * Interface that all Webpack plugins should implement.
 */
export interface WebpackPlugin {
  /**
   * Entry point for a plugin. It should perform any kind of setup or initialization
   * hook into compiler's events.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler): void;
}

/**
 * Common CLI arguments that are used across all commands.
 *
 * @internal
 */
export interface CommonArguments {
  /** Target application platform. */
  platform: string;
  /** Whether to clean any persistent cache. */
  resetCache?: boolean;
  /** Whether to log additional debug messages. */
  verbose?: boolean;
}

/**
 * CLI arguments passed from React Native CLI when running bundle command.
 *
 * @internal
 */
export interface BundleArguments extends CommonArguments {
  assetsDest?: string;
  entryFile: string;
  minify?: boolean;
  dev: boolean;
  bundleOutput: string;
  // bundleEncoding?: string;
  sourcemapOutput?: string;
  // sourcemapSourcesRoot?: string;
  // sourcemapUseAbsolutePath: boolean;
}

/**
 * CLI arguments passed from React Native CLI when running start command.
 *
 * @internal
 */
export interface StartArguments extends CommonArguments {
  cert?: string;
  host?: string;
  https?: boolean;
  key?: string;
  port?: number;
  interactive?: boolean;
}

/**
 * Development server configuration options.
 *
 * Used by {@link DevServerPlugin}, {@link BaseDevServer}, {@link DevServer} and {@link DevServerProxy}.
 */
export interface DevServerOptions {
  /** Hostname under which to run the development server. Defaults to `localhost`. */
  host?: string;
  /** Port under which to run the development server. See: {@link DEFAULT_PORT}. */
  port: number;
  /** Whether to run server on HTTPS instead of HTTP. */
  https?: boolean;
  /** Path to certificate when running server on HTTPS. */
  cert?: string;
  /** Path to certificate key when running server on HTTPS. */
  key?: string;
}

/**
 * Holds all information used by {@link parseCliOptions}.
 *
 * @internal
 */
export interface CliOptions {
  config: {
    root: string;
    reactNativePath: string;
    webpackConfigPath: string;
  };
  command: 'bundle' | 'start';
  arguments:
    | {
        bundle: BundleArguments;
      }
    | {
        start: StartArguments;
      };
}

/**
 * Represents all relevant options that are needed to create a valid Webpack configuration
 * and configure all plugins.
 *
 * This is the return type of {@link parseCliOptions}.
 */
export interface WebpackOptions {
  /** Compilation mode. */
  mode: 'production' | 'development';
  /** Inferred from {@link mode}. `true` is `mode` is `development`. */
  dev: boolean;
  /** Target application platform. */
  platform: string;
  /** Context in which all resolution happens. Usually it's project root directory. */
  context: string;
  /** Input filename - entry point of the bundle. */
  entry: string;
  /** Bundle output path - directory where built bundle will be saved. */
  outputPath: string;
  /** Bundle output filename - name under which built bundle will be saved. */
  outputFilename: string;
  /**
   * Async chunk output filename inferred from `outputPath`, `outputFilename` and `assetsOutputPath`.
   */
  outputChunkFilename: string;
  /**
   * Source map filename - name under which generated Source Map will be saved.
   * The output directory for the Source Map is the same as {@link outputPath}.
   */
  sourcemapFilename?: string;
  /** Directory where all assets (eg: images, video, audio) will be saved. */
  assetsOutputPath?: string;
  /** Whether to minimize the final bundle. */
  minimize: boolean;
  /** Path to React Native dependency. Usually points to `node_modules/react-native`. */
  reactNativePath: string;
  /**
   * Development server configuration options.
   * Used by {@link DevServerPlugin}, {@link BaseDevServer}, {@link DevServer} and {@link DevServerProxy}.
   *
   * If `undefined`, then development server should not be run.
   */
  devServer?: DevServerOptions;
}

/** Log message type. */
export type LogType = 'debug' | 'info' | 'warn' | 'error';

/**
 * Represent log message with all necessary data.
 *
 * @internal
 */
export interface LogEntry {
  timestamp: number;
  type: LogType;
  issuer: string;
  message: any[];
}

/**
 * Represent Hot Module Replacement Update body.
 * Used by {@link WebSocketHMRServer} and `WebpackHMRClient`.
 *
 * @internal
 */
export interface HMRMessageBody {
  name: string;
  time: number;
  hash: string;
  warnings: webpack.StatsCompilation['warnings'];
  errors: webpack.StatsCompilation['errors'];
  modules: Record<string, string>;
}

/**
 * Represent Hot Module Replacement Update message.
 * Used by {@link WebSocketHMRServer} and `WebpackHMRClient`.
 *
 * @internal
 */
export interface HMRMessage {
  action: 'building' | 'built' | 'sync';
  body: HMRMessageBody | null;
}
