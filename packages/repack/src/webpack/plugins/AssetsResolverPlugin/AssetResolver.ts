import path from 'path';
import type fs from 'fs';
import escapeStringRegexp from 'escape-string-regexp';
import type { Compiler, NormalModuleFactory } from '@rspack/core';
import { getAssetExtensionsRegExp } from '../../utils/assetExtensions';

/**
 * {@link AssetResolver} configuration options.
 */
export interface AssetResolverConfig {
  /**
   * Override default asset extensions. If the asset matches one of the extensions, it will be process
   * by the custom React Native asset resolver. Otherwise, the resolution will process normally and
   * the asset will be handled by Webpack.
   */
  extensions?: string[];

  /**
   * Override default scalable extensions, which processes only scalable assets like images
   * to create a map of DPI variants of the asset.
   */
  scalableExtensions?: string[];

  /**
   * Target application platform.
   */
  platform: string;
}

export interface CollectedScales {
  [key: string]: {
    platform: string;
    name: string;
  };
}

interface CollectOptions {
  name: string;
  platform: string;
  type: string;
}

type ResolveData = Parameters<
  NormalModuleFactory['hooks']['beforeResolve']['callAsync']
>[0];

type InnerCallback = Parameters<
  Parameters<NormalModuleFactory['hooks']['beforeResolve']['tapAsync']>[1]
>[1];

export class AssetResolver {
  static collectScales(
    scalableAssetExtensions: string[],
    files: string[],
    { name, type, platform }: CollectOptions
  ): CollectedScales {
    const regex = scalableAssetExtensions.includes(type)
      ? new RegExp(
          `^${escapeStringRegexp(
            name
          )}(@\\d+(\\.\\d+)?x)?(\\.(${platform}|native))?.${escapeStringRegexp(
            type
          )}$`
        )
      : new RegExp(
          `^${escapeStringRegexp(name)}(\\.(${platform}|native))?\\.${type}$`
        );

    const priority = (queryPlatform: string) =>
      ['native', platform].indexOf(queryPlatform);

    // Build a map of files according to the scale
    const output: CollectedScales = {};
    for (const file of files) {
      const match = regex.exec(file);
      if (match) {
        let [, scale, , , platform] = match;
        scale = scale || '@1x';
        if (
          !output[scale] ||
          priority(platform) > priority(output[scale].platform)
        ) {
          output[scale] = { platform, name: file };
        }
      }
    }

    return output;
  }

  constructor(
    public readonly config: AssetResolverConfig,
    private compiler: Compiler
  ) {}

  resolve(resolveData: ResolveData, callback: InnerCallback) {
    const platform = this.config.platform;
    const test = getAssetExtensionsRegExp(this.config.extensions!);
    const logger = this.compiler.getInfrastructureLogger('RepackAssetResolver');
    const inputFileSystem = this.compiler.inputFileSystem as typeof fs;

    if (!test.test(resolveData.request)) {
      callback();
      return;
    }

    const requestPath = path.resolve(
      resolveData.context ?? '',
      resolveData.request
    );

    logger.debug(
      'Processing asset:',
      path.relative(this.compiler.context, requestPath)
    );

    inputFileSystem.readdir(path.dirname(requestPath), (error, files) => {
      if (error) {
        callback(error);
        return;
      }

      const basename = path.basename(requestPath);
      const name = basename.replace(/\.[^.]+$/, '');
      const type = path.extname(requestPath).substring(1);

      let resolved = files.includes(basename) ? requestPath : undefined;

      if (!resolved) {
        const map = AssetResolver.collectScales(
          this.config.scalableExtensions!,
          files,
          { name, type, platform }
        );

        const key = map['@1x']
          ? '@1x'
          : Object.keys(map).sort(
              (a, b) =>
                Number(a.replace(/[^\d.]/g, '')) -
                Number(b.replace(/[^\d.]/g, ''))
            )[0];

        resolved = map[key]?.name
          ? path.resolve(path.dirname(requestPath), map[key].name)
          : undefined;

        if (!resolved) {
          logger.error('Cannot resolve:', requestPath, {
            files,
            scales: map,
          });

          callback();
          return;
        }
      }

      resolveData.request = resolved;
      resolveData.context = path.dirname(resolved);

      logger.debug('Asset resolved:', requestPath, '->', resolved);
      callback();
    });
  }
}
