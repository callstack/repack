import path from 'path';
import fs from 'fs-extra';
import webpack from 'webpack';
import { CLI_OPTIONS_ENV_KEY } from '../../env';
import { CliOptions, WebpackLogger, WebpackPlugin } from '../../types';

/**
 * TODO
 */
export interface OutputPluginConfig {
  devServerEnabled?: boolean;
}

/**
 * TODO
 */
export class OutputPlugin implements WebpackPlugin {
  /**
   * TODO
   * @param config
   */
  constructor(private config: OutputPluginConfig) {}

  /**
   * TODO
   * @param compiler
   * @returns
   */
  apply(compiler: webpack.Compiler) {
    const cliOptions: CliOptions | null = JSON.parse(
      process.env[CLI_OPTIONS_ENV_KEY] ?? 'null'
    );

    // Noop when running from Webpack CLI or when running with dev server
    if (
      !cliOptions ||
      'start' in cliOptions.arguments ||
      this.config.devServerEnabled
    ) {
      return;
    }

    const logger = compiler.getInfrastructureLogger('ReactNativeOutputPlugin');

    const args = cliOptions.arguments.bundle;
    let { bundleOutput, assetsDest = '', sourcemapOutput = '' } = args;
    if (!path.isAbsolute(bundleOutput)) {
      bundleOutput = path.join(cliOptions.config.root, bundleOutput);
    }

    if (!sourcemapOutput) {
      sourcemapOutput = `${bundleOutput}.map`;
    }
    if (!path.isAbsolute(sourcemapOutput)) {
      sourcemapOutput = path.join(cliOptions.config.root, sourcemapOutput);
    }

    if (!assetsDest) {
      assetsDest = path.dirname(bundleOutput);
    }

    logger.debug('Detected output paths:', {
      bundleOutput,
      sourcemapOutput,
      assetsDest,
    });

    compiler.hooks.afterEmit.tapPromise('OutputPlugin', async (compilation) => {
      const assetNames = [...compilation.assetsInfo.keys()].filter(
        (assetName) => !assetName.endsWith('.map')
      );

      const outputPath = compilation.outputOptions.path;
      if (!outputPath) {
        throw new Error('Cannot infer output path from compilation');
      }

      const promises: Promise<void>[] = [];

      for (const assetName of assetNames) {
        const relatedSourceMap = compilation.assetsInfo.get(assetName)?.related
          ?.sourceMap;
        const sourcemapName = Array.isArray(relatedSourceMap)
          ? relatedSourceMap[0]
          : relatedSourceMap;
        if (assetName === (compilation.outputOptions.filename as string)) {
          promises.push(
            this.copyAsset(
              path.join(outputPath, assetName),
              bundleOutput,
              logger
            )
          );
          if (sourcemapName) {
            promises.push(
              this.copyAsset(
                path.join(outputPath, sourcemapName),
                sourcemapOutput,
                logger
              )
            );
          }
        } else {
          promises.push(
            this.copyAsset(
              path.join(outputPath, assetName),
              path.join(assetsDest, assetName),
              logger
            )
          );
          if (sourcemapName) {
            promises.push(
              this.copyAsset(
                path.join(outputPath, sourcemapName),
                path.join(assetsDest, sourcemapName),
                logger
              )
            );
          }
        }
      }

      await Promise.all(promises);
    });
  }

  private async copyAsset(from: string, to: string, logger: WebpackLogger) {
    logger.debug('Copying asset:', from, 'to:', to);
    await fs.ensureDir(path.dirname(to));
    await fs.copyFile(from, to);
  }
}
