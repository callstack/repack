import { CLIError } from '../helpers/index.js';
import { detectBundler } from './common/config/detectBundler.js';
import { makeCompilerConfig } from './common/config/makeCompilerConfig.js';
import {
  getMaxWorkers,
  normalizeStatsOptions,
  resetPersistentCache,
  setupEnvironment,
  setupRspackEnvironment,
  writeStats,
} from './common/index.js';
import type { BundleArguments, Bundler, CliConfig } from './types.js';

/**
 * Unified bundle command that builds and saves the bundle
 * alongside any other assets to filesystem.
 *
 * Auto-detects the bundler engine (rspack or webpack) unless explicitly specified.
 *
 * @param _ Original, non-parsed arguments that were provided when running this command.
 * @param cliConfig Configuration object containing platform and project settings.
 * @param args Parsed command line arguments.
 * @param forcedBundler Optional bundler override from deprecated entry points.
 */
export async function bundle(
  _: string[],
  cliConfig: CliConfig,
  args: BundleArguments,
  forcedBundler?: Bundler
) {
  const bundler =
    forcedBundler ??
    detectBundler(
      cliConfig.root,
      args.config ?? args.webpackConfig,
      args.bundler
    );

  const [config] = await makeCompilerConfig<Record<string, any>>({
    args: args,
    bundler,
    command: 'bundle',
    rootDir: cliConfig.root,
    platforms: [args.platform],
    reactNativePath: cliConfig.reactNativePath,
  });

  // remove devServer configuration to avoid schema validation errors
  delete config.devServer;

  // expose selected args as environment variables
  setupEnvironment(args);

  if (bundler === 'rspack') {
    const maxWorkers = args.maxWorkers ?? getMaxWorkers();
    setupRspackEnvironment(maxWorkers.toString());
  }

  if (!args.entryFile && !config.entry) {
    throw new CLIError("Option '--entry-file <path>' argument is missing");
  }

  if (args.resetCache) {
    if (bundler === 'rspack') {
      resetPersistentCache({
        bundler: 'rspack',
        rootDir: cliConfig.root,
        cacheConfigs: [config.experiments?.cache],
      });
    } else {
      resetPersistentCache({
        bundler: 'webpack',
        rootDir: cliConfig.root,
        cacheConfigs: [config.cache],
      });
    }
  }

  // Dynamic import of bundler engine — both are optional peer dependencies
  let compiler: any;
  if (bundler === 'rspack') {
    const { rspack } = await import('@rspack/core');
    compiler = rspack(config);
  } else {
    const webpack = (await import('webpack')).default;
    compiler = webpack(config);
  }

  return new Promise<void>((resolve) => {
    const errorHandler = async (error: Error | null, stats?: any) => {
      if (error) {
        throw new CLIError(error.message);
      }

      if (stats?.hasErrors()) {
        stats.compilation?.errors?.forEach((e: any) => {
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

    if (args.watch) {
      compiler.hooks.watchClose.tap('bundle', resolve);
      compiler.watch(config.watchOptions ?? {}, errorHandler);
    } else {
      compiler.run((error: Error | null, stats: any) => {
        // make cache work: https://webpack.js.org/api/node/#run
        compiler.close(async (closeErr: Error | null) => {
          if (closeErr) console.error(closeErr);
          await errorHandler(error, stats);
          resolve();
        });
      });
    }
  });
}
