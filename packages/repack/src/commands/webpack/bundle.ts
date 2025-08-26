import webpack, { type Configuration } from 'webpack';
import { CLIError } from '../../helpers/index.js';
import { makeCompilerConfig } from '../common/config/makeCompilerConfig.js';
import {
  normalizeStatsOptions,
  resetPersistentCache,
  writeStats,
} from '../common/index.js';
import { setupEnvironment } from '../common/setupEnvironment.js';
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
  const [config] = await makeCompilerConfig<Configuration>({
    args: args,
    bundler: 'webpack',
    command: 'bundle',
    rootDir: cliConfig.root,
    platforms: [args.platform],
    reactNativePath: cliConfig.reactNativePath,
  });

  // remove devServer configuration to avoid schema validation errors
  delete config.devServer;

  // expose selected args as environment variables
  setupEnvironment(args);

  if (!args.entryFile && !config.entry) {
    throw new CLIError("Option '--entry-file <path>' argument is missing");
  }

  if (args.resetCache) {
    resetPersistentCache({
      bundler: 'webpack',
      rootDir: cliConfig.root,
      cacheConfigs: [config.cache],
    });
  }

  const errorHandler = async (error: Error | null, stats?: webpack.Stats) => {
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

  const compiler = webpack(config);

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
