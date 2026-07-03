import { type Configuration, rspack } from '@rspack/core';
import type { Stats } from '@rspack/core';
import { CLIError, isRspack2 } from '../../helpers/index.js';
import { makeCompilerConfig } from '../common/config/makeCompilerConfig.js';
import {
  getMaxWorkers,
  getRspackCacheConfig,
  normalizeStatsOptions,
  resetPersistentCache,
  setupEnvironment,
  setupRspackEnvironment,
  warnLegacyRspackCacheConfig,
  writeStats,
} from '../common/index.js';
import type { BundleArguments, CliConfig } from '../types.js';

/**
 * Bundle command that builds and saves the bundle
 * alongside any other assets to filesystem using Webpack.
 *
 * @param _ Original, non-parsed arguments that were provided when running this command.
 * @param cliConfig Configuration object containing platform and project settings.
 * @param args Parsed command line arguments.
 */
export async function bundle(
  _: string[],
  cliConfig: CliConfig,
  args: BundleArguments
) {
  const [{ devServer: _devServer, ...config }] =
    await makeCompilerConfig<Configuration>({
      args: args,
      bundler: 'rspack',
      command: 'bundle',
      rootDir: cliConfig.root,
      platforms: [args.platform],
      reactNativePath: cliConfig.reactNativePath,
    });

  // Rspack 2 silently ignores the legacy `experiments.cache` option -
  // warn the user so they migrate it to the top-level `cache` option
  if (isRspack2(cliConfig.root)) {
    warnLegacyRspackCacheConfig([config]);
  }

  // expose selected args as environment variables
  setupEnvironment(args);

  const maxWorkers = args.maxWorkers ?? getMaxWorkers();
  setupRspackEnvironment(maxWorkers.toString());

  if (!args.entryFile && !config.entry) {
    throw new CLIError("Option '--entry-file <path>' argument is missing");
  }

  if (args.resetCache) {
    resetPersistentCache({
      bundler: 'rspack',
      rootDir: cliConfig.root,
      cacheConfigs: [getRspackCacheConfig(config)],
    });
  }

  const errorHandler = async (error: Error | null, stats?: Stats) => {
    if (error) {
      throw new CLIError(error.message);
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

      try {
        await writeStats(statsJson, {
          filepath: args.json,
          rootDir: compiler.context,
        });
      } catch (e) {
        throw new CLIError(String(e));
      }
    }
  };

  // `devServer` is split off above - it's not needed for bundling, and
  // Re.Pack's own dev server options (augmented onto `Configuration`) are
  // not assignable to Rspack's bundled `DevServer` type
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
