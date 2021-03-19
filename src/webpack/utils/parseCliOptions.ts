import path from 'path';
import { CLI_OPTIONS_ENV_KEY } from '../../env';
import { CliOptions, WebpackOptions } from '../../types';

export type WebpackOptionsWithoutPlatform = Omit<WebpackOptions, 'platform'>;

export type OptionalWebpackOptions = {
  [K in keyof WebpackOptionsWithoutPlatform]?: WebpackOptions[K];
};

/**
 * {@link WebpackOptions} for fallback used by {@link parseCliOptions}.
 * All fields expect for `platform` are optional. Check {@link DEFAULT_FALLBACK}
 * for fallback defaults.
 */
export interface FallbackWebpackOptions extends OptionalWebpackOptions {
  /** Target application platform. */
  platform: WebpackOptions['platform'];
}

/**
 * {@link parseCliOptions} configuration options.
 */
export interface ParseCliOptionsConfig {
  /**
   * Fallback values to use if some or all the values are not provided by React Native CLI.
   * Common use of the fallback is when running with Webpack CLI.
   * Compared to {@link WebpackOptions}, only `platform` is required. Check {@link DEFAULT_FALLBACK}
   * for fallback defaults.
   */
  fallback: FallbackWebpackOptions;
}

/** Sensible default for Webpack configuration to fallback to, when running with Webpack CLI. */
export const DEFAULT_FALLBACK: WebpackOptionsWithoutPlatform = {
  mode: 'development',
  dev: true,
  entry: './index.js',
  outputPath: path.join(process.cwd(), 'dist'),
  assetsOutputPath: path.join(process.cwd(), 'dist'),
  outputFilename: 'index.bundle',
  sourcemapFilename: '[file].map',
  context: process.cwd(),
  reactNativePath: path.join(process.cwd(), './node_modules/react-native'),
  minimize: false,
  outputChunkFilename: '[id].index.bundle',
};

/** Default development server (proxy) port. */
export const DEFAULT_PORT = 8081;

/**
 * Parse CLI arguments received from React Native CLI when running {@link start} or {@link bundle}
 * commands. The CLI options will be only available when running with React Native CLI. When running
 * with Webpack CLI, values from `fallback` field from {@link ParseCliOptionsConfig} will be used.
 *
 * `fallback.mode` and `fallback.dev` values should always go together as a tuple:
 * `('development', true)` or `('production', false)`. Specifying different values might result in
 * undefined behavior. You can however omit one and the other will be inferred.
 *
 * @param config Configuration options.
 * @returns Webpack options to create a valid Webpack configuration with.
 *
 * @category Webpack util
 */
export function parseCliOptions(config: ParseCliOptionsConfig): WebpackOptions {
  const fallback: WebpackOptions = { ...DEFAULT_FALLBACK, ...config.fallback };
  const { mode, dev } = config.fallback;
  if (mode !== undefined && dev === undefined) {
    fallback.dev = mode === 'development';
  } else if (mode === undefined && dev !== undefined) {
    fallback.mode = dev ? 'development' : 'production';
  }

  const rawCliOptions = process.env[CLI_OPTIONS_ENV_KEY];
  if (!rawCliOptions) {
    return fallback;
  }

  const cliOptions: CliOptions = JSON.parse(rawCliOptions);

  if ('bundle' in cliOptions.arguments) {
    const args = cliOptions.arguments.bundle;

    let outputPath = path.dirname(args.bundleOutput);
    if (!path.isAbsolute(outputPath)) {
      outputPath = path.join(cliOptions.config.root, outputPath);
    }
    const outputFilename = path.basename(args.bundleOutput);
    const entry = args.entryFile;

    let sourcemapFilename = fallback.sourcemapFilename;
    // Make sure `sourcemapFilename` is relative, otherwise `SourceMapDevToolPlugin` will
    // throw invalid configuration error.
    if (args.sourcemapOutput) {
      sourcemapFilename = path.isAbsolute(args.sourcemapOutput)
        ? path.relative(outputPath, args.sourcemapOutput)
        : args.sourcemapOutput;
    }

    return {
      mode: args.dev ? 'development' : 'production',
      dev: args.dev,
      context: cliOptions.config.root,
      platform: args.platform,
      entry: entry.startsWith('./') ? entry : `./${entry}`,
      outputPath,
      outputFilename,
      sourcemapFilename,
      outputChunkFilename: `${path.relative(
        outputPath,
        args.assetsDest ?? outputPath
      )}/[id].${outputFilename}`,
      assetsOutputPath: args.assetsDest,
      minimize: Boolean(args.minify),
      reactNativePath: cliOptions.config.reactNativePath,
    };
  } else if ('start' in cliOptions.arguments) {
    const args = cliOptions.arguments.start;

    return {
      mode: 'development',
      dev: true,
      context: cliOptions.config.root,
      platform: args.platform,
      entry: fallback.entry,
      outputPath: fallback.outputPath,
      outputFilename: fallback.outputFilename,
      sourcemapFilename: fallback.sourcemapFilename,
      outputChunkFilename: fallback.outputChunkFilename,
      assetsOutputPath: undefined,
      minimize: false,
      reactNativePath: cliOptions.config.reactNativePath,
      devServer: {
        host: args.host || undefined,
        port:
          args.port ??
          (typeof fallback.devServer === 'boolean' ||
          fallback.devServer?.port === undefined
            ? DEFAULT_PORT
            : fallback.devServer.port),
        https: args.https,
        cert: args.cert || undefined,
        key: args.key || undefined,
      },
    };
  }

  throw new Error(
    `Failed to parse CLI options: ${JSON.stringify({
      command: cliOptions.command,
      arguments: Object.keys(cliOptions.arguments),
    })}`
  );
}
