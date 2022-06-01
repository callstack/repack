import { workerData, parentPort } from 'worker_threads';
import webpack from 'webpack';
import type { CliOptions } from '../types';

const cliOptions = workerData as CliOptions;

const webpackConfig = require(cliOptions.config
  .webpackConfigPath) as webpack.Configuration;
const watchOptions = webpackConfig.watchOptions ?? {};
const compiler = webpack(webpackConfig);

compiler.hooks.watchRun.tap('webpackWorker', () => {
  parentPort?.postMessage({ event: 'watchRun' });
});

compiler.hooks.invalid.tap('webpackWorker', () => {
  parentPort?.postMessage({ event: 'invalid' });
});

compiler.hooks.done.tap('webpackWorker', () => {
  parentPort?.postMessage({ event: 'done' });
});

compiler.watch(watchOptions, (error) => {
  if (error) {
    parentPort?.postMessage({ event: 'error', error });
  }
});
