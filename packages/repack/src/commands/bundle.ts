import { Config } from '@react-native-community/cli-types';
import webpack from 'webpack';
import { CLI_OPTIONS_ENV_KEY, VERBOSE_ENV_KEY } from '../env';
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

  process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify(cliOptions);
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
    compiler.run((error) => {
      if (error) {
        reject();
        console.error(error);
        process.exit(2);
      } else {
        resolve();
      }
    });
  });
}
