import { Config } from '@react-native-community/cli-types';
import fs from 'fs-extra';
import { stringifyStream } from '@discoveryjs/json-ext';
import webpack from 'webpack';
import { VERBOSE_ENV_KEY } from '../env';
import { BundleArguments, CliOptions } from '../types';
import { loadWebpackConfig } from '../webpack/loadWebpackConfig';
import { getWebpackEnvOptions } from '../webpack/utils';
import { getWebpackConfigPath } from './utils/getWebpackConfigPath';

/**
 * Bundle command for React Native CLI.
 * It runs Webpack, builds bundle and saves it alongside any other assets and Source Map
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
  config: Config,
  args: BundleArguments
) {
  const webpackConfigPath = getWebpackConfigPath(
    config.root,
    args.webpackConfig
  );
  const cliOptions = {
    config: {
      root: config.root,
      reactNativePath: config.reactNativePath,
      webpackConfigPath,
    },
    command: 'bundle',
    arguments: {
      bundle: args,
    },
  } as CliOptions;

  if (args.verbose ?? process.argv.includes('--verbose')) {
    process.env[VERBOSE_ENV_KEY] = '1';
  }

  const webpackEnvOptions = getWebpackEnvOptions(cliOptions);
  const webpackConfig = await loadWebpackConfig(
    webpackConfigPath,
    webpackEnvOptions
  );
  const compiler = webpack(webpackConfig);

  return new Promise<void>((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) {
        reject();
        console.error(error);
        process.exit(2);
      } else {
        if (stats?.hasErrors()) {
          reject();
          stats.compilation?.errors?.forEach((e) => {
            console.error(e);
          });
          process.exit(2);
        }

        if (args.json && stats !== undefined) {
          console.log(`Writing compiler stats`);

          let statOptions: Parameters<typeof stats.toJson>[0];
          if (args.stats !== undefined) {
            statOptions = { preset: args.stats };
          } else if (typeof compiler.options.stats === 'boolean') {
            statOptions = compiler.options.stats
              ? { preset: 'normal' }
              : { preset: 'none' };
          } else {
            statOptions = compiler.options.stats;
          }

          const statsJson = stats.toJson(statOptions);
          // Stats can be fairly big at which point their JSON no longer fits into a single string.
          // Approach was copied from `webpack-cli`: https://github.com/webpack/webpack-cli/blob/c03fb03d0aa73d21f16bd9263fd3109efaf0cd28/packages/webpack-cli/src/webpack-cli.ts#L2471-L2482
          const outputStream = fs.createWriteStream(args.json);

          stringifyStream(statsJson)
            .on('error', (error) => {
              reject();
              console.error(error);
              process.exit(2);
            })
            .pipe(outputStream)
            .on('error', (error) => {
              reject();
              console.error(error);
              process.exit(2);
            })
            .on('close', () => {
              console.log(`Wrote compiler stats to ${args.json}`);
              resolve();
            });
        } else {
          resolve();
        }
      }
    });
    // eslint-disable-next-line promise/prefer-await-to-then
  }).then(() => {
    return new Promise<void>((resolve, reject) => {
      // make cache work: https://webpack.js.org/api/node/#run
      compiler.close((error) => {
        if (error) {
          reject();
        } else {
          resolve();
        }
      });
    });
  });
}
