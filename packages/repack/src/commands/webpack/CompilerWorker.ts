import path from 'node:path';
import { workerData, parentPort } from 'node:worker_threads';
import memfs from 'memfs';
import webpack, { type Configuration } from 'webpack';
import { adaptFilenameToPlatform, getEnvOptions, loadConfig } from '../common';
import type {
  WorkerMessages,
  WebpackWorkerOptions,
  CompilerAsset,
} from './types';

function postMessage(message: WorkerMessages.WorkerMessage): void {
  parentPort?.postMessage(message);
}

async function main({ cliOptions, platform }: WebpackWorkerOptions) {
  const webpackEnvOptions = getEnvOptions(cliOptions);
  const webpackConfig = await loadConfig<Configuration>(
    cliOptions.config.bundlerConfigPath,
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
        postMessage({
          event: 'progress',
          completed: Number.parseInt(completed, 10),
          total: Number.parseInt(total, 10),
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
    postMessage({ event: 'watchRun' });
  });

  compiler.hooks.invalid.tap('webpackWorker', () => {
    postMessage({ event: 'invalid' });
  });

  compiler.hooks.done.tap('webpackWorker', (stats) => {
    const compilerStats = stats.toJson({
      all: false,
      assets: true,
      children: true,
      outputPath: true,
      timings: true,
      hash: true,
      errors: true,
      warnings: true,
    });

    const assets = compilerStats.assets!;
    const outputDirectory = compilerStats.outputPath!;

    const compilerAssets = assets
      .filter((asset) => asset.type === 'asset')
      .reduce(
        (acc, { name, info, size }) => {
          const assetPath = path.join(outputDirectory, name);
          const data = fileSystem.readFileSync(assetPath) as Buffer;
          const asset = { data, info, size };

          acc[adaptFilenameToPlatform(name)] = asset;

          if (info.related?.sourceMap) {
            const sourceMapName = Array.isArray(info.related.sourceMap)
              ? info.related.sourceMap[0]
              : info.related.sourceMap;
            const sourceMapPath = path.join(outputDirectory, sourceMapName);
            const sourceMapData = fileSystem.readFileSync(
              sourceMapPath
            ) as Buffer;
            const sourceMapAsset = {
              data: sourceMapData,
              info: {
                hotModuleReplacement: info.hotModuleReplacement,
                size: sourceMapData.length,
              },
              size: sourceMapData.length,
            };

            acc[adaptFilenameToPlatform(sourceMapName)] = sourceMapAsset;
          }

          return acc;
        },
        {} as Record<string, CompilerAsset>
      );

    postMessage({
      event: 'done',
      assets: compilerAssets,
      stats: compilerStats,
    });
  });

  compiler.watch(watchOptions, (error) => {
    if (error) {
      postMessage({ event: 'error', error });
    }
  });
}

main(workerData).catch((error) => {
  postMessage({ event: 'error', error });
  process.exit(1);
});
