import { workerData, parentPort } from 'worker_threads';
import path from 'path';
import webpack from 'webpack';
import memfs from 'memfs';
import type { CliOptions } from '../types';

const cliOptions = workerData as CliOptions;

const webpackConfig = require(cliOptions.config
  .webpackConfigPath) as webpack.Configuration;
const watchOptions = webpackConfig.watchOptions ?? {};
const compiler = webpack(webpackConfig);

const fileSystem = memfs.createFsFromVolume(new memfs.Volume());
compiler.outputFileSystem = fileSystem;

compiler.hooks.watchRun.tap('webpackWorker', () => {
  parentPort?.postMessage({ event: 'watchRun' });
});

compiler.hooks.invalid.tap('webpackWorker', () => {
  parentPort?.postMessage({ event: 'invalid' });
});

compiler.hooks.done.tap('webpackWorker', (stats) => {
  const assetFilenames = stats.compilation
    .getAssets()
    .map((asset) => asset.name);
  const outputDirectory = stats.compilation.outputOptions.path!;
  const assets = assetFilenames.map((filename) => {
    const data = fileSystem.readFileSync(
      path.join(outputDirectory, filename)
    ) as Buffer;
    return {
      filename,
      data,
    };
  });
  parentPort?.postMessage(
    { event: 'done', assets },
    assets.map((asset) => asset.data.buffer)
  );
});

compiler.watch(watchOptions, (error) => {
  if (error) {
    parentPort?.postMessage({ event: 'error', error });
  }
});
