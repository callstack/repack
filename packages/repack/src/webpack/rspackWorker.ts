import { workerData, parentPort } from 'worker_threads';
import path from 'path';
import { rspack } from '@rspack/core';
import memfs from 'memfs';
import type { CliOptions } from '../types';
import { getWebpackEnvOptions } from './utils';
import { loadRspackConfig } from './loadRspackConfig';

async function main(cliOptions: CliOptions) {
  const webpackEnvOptions = getWebpackEnvOptions(cliOptions);
  const rspackConfig = await loadRspackConfig(
    cliOptions.config.webpackConfigPath,
    webpackEnvOptions
  );
  const watchOptions = rspackConfig.watchOptions ?? {};

  // Disable clean output to retain assets between builds
  // TODO verify if this is still the case
  rspackConfig.output = { ...rspackConfig.output, clean: false };

  const compiler = rspack(rspackConfig);

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
