import { workerData, parentPort } from 'worker_threads';
import path from 'path';
import webpack from 'webpack';
import memfs from 'memfs';
import type { CliOptions } from '../types';

const cliOptions = workerData as CliOptions;

const webpackConfig = require(cliOptions.config
  .webpackConfigPath) as webpack.Configuration;
const watchOptions = webpackConfig.watchOptions ?? {};

webpackConfig.plugins = (webpackConfig.plugins ?? []).concat(
  new webpack.ProgressPlugin((_1, _2, message) => {
    const [, completed, total] = /(\d+)\/(\d+) modules/.exec(message) ?? [];
    if (completed !== undefined && total !== undefined) {
      parentPort?.postMessage({
        event: 'progress',
        completed: parseInt(completed, 10),
        total: parseInt(total, 10),
      });
    }
  })
);

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
  const outputDirectory = stats.compilation.outputOptions.path!;
  const assets = stats.compilation.getAssets().map((asset) => {
    const data = fileSystem.readFileSync(
      path.join(outputDirectory, asset.name)
    ) as Buffer;
    return {
      filename: asset.name,
      data,
      info: asset.info,
    };
  });
  parentPort?.postMessage(
    {
      event: 'done',
      assets,
      stats: stats.toJson({
        all: false,
        cached: true,
        children: true,
        modules: true,
        timings: true,
        hash: true,
        errors: true,
        warnings: false,
      }),
    },
    assets.map((asset) => asset.data.buffer)
  );
});

compiler.watch(watchOptions, (error) => {
  if (error) {
    parentPort?.postMessage({ event: 'error', error });
  }
});
