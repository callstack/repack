import { type Configuration, rspack } from '@rspack/core';
import type { Stats } from '@rspack/core';
import { makeCompilerConfig } from '../common/config/makeCompilerConfig.js';
import { CLIError } from '../common/error.js';
import { normalizeStatsOptions, writeStats } from '../common/index.js';
import { setupEnvironment } from '../common/setupEnvironment.js';
import type { BundleArguments, CliConfig } from '../types.js';

/**
 * Bundle command for React Native Community CLI.
 * It runs Rspack, builds bundle and saves it alongside any other assets and Source Map
 * to filesystem.
 *
 * @param _ Original, non-parsed arguments that were provided when running this command.
 * @param config React Native Community CLI configuration object.
 * @param args Parsed command line arguments.
 *
 * @internal
 * @category CLI command
 */
export async function bundle(
  _: string[],
  cliConfig: CliConfig,
  args: BundleArguments
) {
  const [config] = await makeCompilerConfig<Configuration>({
    args: args,
    bundler: 'rspack',
    command: 'bundle',
    rootDir: cliConfig.root,
    platforms: [args.platform],
    reactNativePath: cliConfig.reactNativePath,
  });

  // expose selected args as environment variables
  setupEnvironment(args);

  if (!args.entryFile && !config.entry) {
    throw new CLIError("Option '--entry-file <path>' argument is missing");
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
