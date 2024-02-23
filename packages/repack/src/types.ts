import webpack from 'webpack';

export type Rule = string | RegExp;

export interface Fallback<T> {
  fallback: T | (() => T);
}

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
  /** Custom path to Webpack config. */
  webpackConfig?: string;
}

/**
 * CLI arguments passed from React Native CLI when running bundle command.
 *
 * @internal
 */
export interface BundleArguments extends CommonArguments {
  assetsDest?: string;
  entryFile: string;
  json?: string;
  minify?: boolean;
  dev: boolean;
  bundleOutput: string;
  // bundleEncoding?: string;
  sourcemapOutput?: string;
  // sourcemapSourcesRoot?: string;
  // sourcemapUseAbsolutePath: boolean;
  stats?: string;
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
  silent?: boolean;
  verbose?: boolean;
  json?: boolean;
  reversePort?: boolean;
  logFile?: string;
  experimentalDebugger?: boolean;
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
 * Development server configuration options.
 */
export interface DevServerOptions {
  /**
   * Hostname or IP address under which to run the development server.
   *
   * See: {@link DEFAULT_HOSTNAME}.
   */
  host?: string;

  /**
   * Port under which to run the development server.
   *
   * See: {@link DEFAULT_PORT}.
   */
  port: number;

  /**
   * HTTPS options.
   * If specified, the server will use HTTPS, otherwise HTTP.
   */
  https?: {
    /** Path to certificate when running server on HTTPS. */
    cert?: string;

    /** Path to certificate key when running server on HTTPS. */
    key?: string;
  };

  /** Whether to enable Hot Module Replacement. */
  hmr?: boolean;
}

/**
 * Represents all relevant options that are passed to Webpack config function,
 * needed to create a valid Webpack configuration and configure all plugins.
 *
 * This is the return type of {@link parseCliOptions}.
 */
export interface WebpackEnvOptions {
  /** Compilation mode. */
  mode?: 'production' | 'development';

  /** Target application platform. */
  platform?: string;

  /** Context in which all resolution happens. Usually it's project root directory. */
  context?: string;

  /** Input filename - entry point of the bundle. */
  entry?: string;

  /** Bundle output filename - name under which generated bundle will be saved. */
  bundleFilename?: string;

  /**
   * Source map filename - name under which generated source map (for the main bundle) will be saved.
   */
  sourceMapFilename?: string;

  /** Assets output path - directory where generated static assets will be saved. */
  assetsPath?: string;

  /** Whether to minimize the final bundle. */
  minimize?: boolean;

  /** Path to React Native dependency. Usually points to `node_modules/react-native`. */
  reactNativePath?: string;

  /**
   * Development server configuration options.
   * Used to configure `@callstack/repack-dev-server`.
   *
   * If `undefined`, then development server should not be run.
   */
  devServer?: DevServerOptions;
}

/**
 * Represent Hot Module Replacement Update body.
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
 *
 * @internal
 */
export interface HMRMessage {
  action: 'building' | 'built' | 'sync';
  body: HMRMessageBody | null;
}
