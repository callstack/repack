import { workerData, parentPort } from 'worker_threads';
import path from 'path';
import { rspack, ProgressPlugin } from '@rspack/core';
import memfs from 'memfs';
import { globSync } from 'glob';
import type { CliOptions } from '../types';
import { getWebpackEnvOptions } from './utils';
import { loadWebpackConfig } from './loadWebpackConfig';

async function main(cliOptions: CliOptions) {
  const webpackEnvOptions = getWebpackEnvOptions(cliOptions);
  const webpackConfig = await loadWebpackConfig(
    cliOptions.config.webpackConfigPath,
    webpackEnvOptions
  );
  const watchOptions = webpackConfig.watchOptions ?? {};

  // Disable clean output to retain assets between builds
  webpackConfig.output = { ...webpackConfig.output, clean: false };

  webpackConfig.plugins = (webpackConfig.plugins ?? []).concat(
    new ProgressPlugin({
      prefix: `📦 Bundling ${webpackEnvOptions.platform}`,
    })
  );

  const compiler = rspack(webpackConfig);

  const fileSystem = memfs.createFsFromVolume(new memfs.Volume());
  // @ts-ignore
  compiler.outputFileSystem = fileSystem;

  compiler.hooks.watchRun.tap('webpackWorker', () => {
    parentPort?.postMessage({ event: 'watchRun' });
  });

  compiler.hooks.invalid.tap('webpackWorker', () => {
    parentPort?.postMessage({ event: 'invalid' });
  });

  compiler.hooks.done.tap('webpackWorker', (stats) => {
    // TODO Figure out the best way to get a list of assets
    // Right now we will keep on stacking up on hot update assets
    const globbedAssets = globSync('**/*', {
      // @ts-expect-error incompatible types
      fs: fileSystem,
      nodir: true,
      cwd: compiler.options.output.path,
    });
    const outputDirectory = stats.compilation.outputOptions.path!;
    const assets = globbedAssets.map((filename) => {
      const data = fileSystem.readFileSync(
        path.join(outputDirectory, filename)
      ) as Buffer;
      return {
        filename,
        data,
      };
    });
    parentPort?.postMessage(
      {
        event: 'done',
        assets,
        // TODO add CLI option to enable all stats for the api endpoint in dev server
        stats: stats.toJson({
          all: false,
          timings: true,
          hash: true,
          errors: true,
          warnings: true,
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
}

main(workerData).catch((error) => {
  parentPort?.postMessage({ event: 'error', error });
  process.exit(1);
});
