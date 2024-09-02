import path from 'node:path';
import { workerData, parentPort } from 'node:worker_threads';
import memfs from 'memfs';
import webpack, { Configuration } from 'webpack';
import { getEnvOptions, loadConfig } from '../common';
import type { WebpackWorkerOptions } from './types';

async function main({ cliOptions, platform }: WebpackWorkerOptions) {
  const webpackEnvOptions = getEnvOptions(cliOptions);
  const webpackConfig = await loadConfig<Configuration>(
    cliOptions.config.webpackConfigPath,
    { ...webpackEnvOptions, platform }
  );
  const watchOptions = webpackConfig.watchOptions ?? {};

  webpackConfig.plugins = (webpackConfig.plugins ?? []).concat(
    new webpack.ProgressPlugin({
      entries: false,
      dependencies: false,
      modules: true,
      handler: (percentage, message, text) => {
        const [, completed, total] = /(\d+)\/(\d+) modules/.exec(text) ?? [];
        parentPort?.postMessage({
          event: 'progress',
          completed: parseInt(completed, 10),
          total: parseInt(total, 10),
          percentage: percentage,
          label: message,
          message: text,
        });
      },
    })
  );

  const compiler = webpack(webpackConfig);

  const fileSystem = memfs.createFsFromVolume(new memfs.Volume());

  // @ts-expect-error memfs is compatible enough
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
    parentPort?.postMessage({
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
    });
  });

  compiler.watch(watchOptions, (error) => {
    if (error) {
      parentPort?.postMessage({ event: 'error', error });
    }
  });
}

main(workerData).catch((error) => {
  parentPort?.postMessage({ event: 'error', error });
  process.exit(1);
});
