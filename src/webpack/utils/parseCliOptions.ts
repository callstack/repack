import path from 'path';
import { CliOptions, WebpackOptions } from '../../types';

export const CLI_OPTIONS_KEY = 'HAUL2_CLI_OPTIONS';

export interface ParseCliOptionsConfig {
  fallback?: WebpackOptions;
}

export function parseCliOptions(config: ParseCliOptionsConfig): WebpackOptions {
  const rawCliOptions = process.env[CLI_OPTIONS_KEY];
  if (!rawCliOptions) {
    if (!config.fallback) {
      throw new Error();
    }

    return config.fallback;
  }

  const cliOptions: CliOptions = JSON.parse(rawCliOptions);

  const outputPath = path.dirname(cliOptions.arguments.bundleOutput);
  const outputFilename = path.basename(cliOptions.arguments.bundleOutput);
  const entry = cliOptions.arguments.entryFile;

  return {
    mode: cliOptions.arguments.dev ? 'development' : 'production',
    dev: cliOptions.arguments.dev,
    context: cliOptions.config.root,
    platform: cliOptions.arguments.platform,
    entry: entry.startsWith('./') ? entry : `./${entry}`,
    outputPath,
    outputFilename,
    sourcemapFilename: cliOptions.arguments.sourcemapOutput,
    assetsOutputPath: cliOptions.arguments.assetsDest,
    minimize: Boolean(cliOptions.arguments.minify),
    reactNativePath: cliOptions.config.reactNativePath,
  };
}
