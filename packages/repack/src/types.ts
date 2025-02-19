export type Rule = string | RegExp;

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
  port?: number;

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
export interface EnvOptions {
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

export interface HMRMessage {
  action: 'compiling' | 'hash' | 'ok';
  body: {
    name: string;
    hash?: string;
    hasErrors?: boolean;
  };
}

export interface Logger {
  debug: (...message: string[]) => void;
  info: (...message: string[]) => void;
  warn: (...message: string[]) => void;
  error: (...message: string[]) => void;
}
