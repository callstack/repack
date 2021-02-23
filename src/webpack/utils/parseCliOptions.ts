import path from 'path';
import { CliOptions, WebpackOptions } from '../../types';

export const CLI_OPTIONS_KEY = 'HAUL2_CLI_OPTIONS';

export type WebpackOptionsWithoutPlatform = Omit<WebpackOptions, 'platform'>;

export type OptionalWebpackOptions = {
  [K in keyof WebpackOptionsWithoutPlatform]?: WebpackOptions[K];
};

export interface FallbackWebpackOptions extends OptionalWebpackOptions {
  platform: WebpackOptions['platform'];
}

export interface ParseCliOptionsConfig {
  fallback: FallbackWebpackOptions;
}

export const DEFAULT_FALLBACK: WebpackOptionsWithoutPlatform = {
  mode: 'development',
  dev: true,
  entry: './index.js',
  outputPath: path.join(process.cwd(), 'dist'),
  assetsOutputPath: path.join(process.cwd(), 'dist'),
  outputFilename: 'index.bundle',
  context: process.cwd(),
  reactNativePath: path.join(process.cwd(), './node_modules/react-native'),
  minimize: false,
};

export const DEFAULT_PORT = 8081;

export function parseCliOptions(config: ParseCliOptionsConfig): WebpackOptions {
  const fallback: WebpackOptions = { ...DEFAULT_FALLBACK, ...config.fallback };
  const rawCliOptions = process.env[CLI_OPTIONS_KEY];
  if (!rawCliOptions) {
    return fallback;
  }

  const cliOptions: CliOptions = JSON.parse(rawCliOptions);

  if ('bundle' in cliOptions.arguments) {
    const args = cliOptions.arguments.bundle;

    const outputPath = path.dirname(args.bundleOutput);
    const outputFilename = path.basename(args.bundleOutput);
    const entry = args.entryFile;

    return {
      mode: args.dev ? 'development' : 'production',
      dev: args.dev,
      context: cliOptions.config.root,
      platform: args.platform,
      entry: entry.startsWith('./') ? entry : `./${entry}`,
      outputPath,
      outputFilename,
      sourcemapFilename: args.sourcemapOutput,
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
      outputFilename: `index.${args.platform}.bundle`,
      sourcemapFilename: undefined,
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

  throw new Error('todo: should never happen');
}
