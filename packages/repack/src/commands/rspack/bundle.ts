import { Config } from '@react-native-community/cli-types';
import { Configuration, rspack } from '@rspack/core';
import type { Stats } from '@rspack/core';
import { VERBOSE_ENV_KEY } from '../../env';
import { BundleArguments, BundleCliOptions } from '../types';
import {
  getRspackConfigFilePath,
  getEnvOptions,
  loadConfig,
  normalizeStatsOptions,
  writeStats,
} from '../common';

/**
 * Bundle command for React Native CLI.
 * It runs Rspack, builds bundle and saves it alongside any other assets and Source Map
 * to filesystem.
 *
 * @param _ Original, non-parsed arguments that were provided when running this command.
 * @param config React Native CLI configuration object.
 * @param args Parsed command line arguments.
 *
 * @internal
 * @category CLI command
 */
export async function bundle(
  _: string[],
  cliConfig: Config,
  args: BundleArguments
) {
  const webpackConfig = getRspackConfigFilePath(
    cliConfig.root,
    args.webpackConfig
  );

  const cliOptions = {
    config: {
      root: cliConfig.root,
      reactNativePath: cliConfig.reactNativePath,
      webpackConfigPath: webpackConfig,
    },
    command: 'bundle',
    arguments: {
      bundle: args,
    },
  } as BundleCliOptions;

  if (!args.entryFile) {
    throw new Error("Option '--entry-file <path>' argument is missing");
  }

  if (args.verbose ?? process.argv.includes('--verbose')) {
    process.env[VERBOSE_ENV_KEY] = '1';
  }

  const envOptions = getEnvOptions(cliOptions);
  const config = await loadConfig<Configuration>(webpackConfig, envOptions);

  const errorHandler = async (error: Error | null, stats?: Stats) => {
    if (error) {
      console.error(error);
      process.exit(2);
    }

    if (stats?.hasErrors()) {
      stats.compilation?.errors?.forEach((e) => {
        console.error(e);
      });
      process.exit(2);
    }

    if (args.json && stats !== undefined) {
      const statsOptions = normalizeStatsOptions(
        compiler.options.stats,
        args.stats
      );

      const statsJson = stats.toJson(statsOptions);
      await writeStats(statsJson, args.json);
    }
  };

  const compiler = rspack(config);

  return new Promise<void>((resolve) => {
    if (args.watch) {
      compiler.hooks.watchClose.tap('bundle', resolve);
      compiler.watch(config.watchOptions ?? {}, errorHandler);
    } else {
      compiler.run((error, stats) => {
        // make cache work: https://webpack.js.org/api/node/#run
        compiler.close(async (closeErr) => {
          if (closeErr) console.error(closeErr);
          await errorHandler(error, stats);
          resolve();
        });
      });
    }
  });
}
