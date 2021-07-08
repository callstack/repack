import path from 'path';
import escapeStringRegexp from 'escape-string-regexp';
import webpack from 'webpack';
import { HookMap, SyncHook } from 'tapable';

/**
 * {@link AssetResolver} configuration options.
 */
export interface AssetResolverConfig {
  /**
   * Override default test RegExp. If the asset matches the `test` RegExp, it will be process
   * by the custom React Native asset resolver. Otherwise, the resolution will process normally and
   * the asset will be handled by Webpack.
   */
  test?: RegExp;
  /** Target application platform. */
  platform: string;
}

interface CollectedScales {
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

// Resolver is not directly exposed from webpack types so we need to do some TS trickery to
// get the type.
type Resolver = webpack.Compiler['resolverFactory']['hooks']['resolver'] extends HookMap<
  infer H
>
  ? H extends SyncHook<infer S>
    ? S extends any[]
      ? S[0]
      : never
    : never
  : never;

export class AssetResolver {
  static DEFAULT_TEST = /\.(aac|aiff|bmp|caf|gif|html|jpeg|jpg|m4a|m4v|mov|mp3|mp4|mpeg|mpg|obj|otf|pdf|png|psd|svg|ttf|wav|webm|webp)$/;

  static collectScales(
    files: string[],
    { name, type, platform }: CollectOptions
  ): CollectedScales {
    // TODO: make it configurable
    const regex = /^(bmp|gif|jpg|jpeg|png|psd|tiff|webp|svg)$/.test(type)
      ? new RegExp(
          `^${escapeStringRegexp(
            name
          )}(@\\d+(\\.\\d+)?x)?(\\.(${platform}|native))?\\.${type}$`
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
    private compiler: webpack.Compiler
  ) {
    if (!this.config.test) {
      this.config.test = AssetResolver.DEFAULT_TEST;
    }
  }

  apply(resolver: Resolver) {
    const platform = this.config.platform;
    const test = this.config.test!;

    const logger = this.compiler.getInfrastructureLogger(
      'ReactNativeAssetResolver'
    );

    resolver
      .getHook('file')
      .tapAsync('ReactNativeAssetResolver', (request, _context, callback) => {
        const requestPath = request.path;
        if (
          (typeof requestPath === 'string' && !test.test(requestPath)) ||
          requestPath === false
        ) {
          callback();
          return;
        }

        logger.debug('Processing asset:', requestPath);

        resolver.fileSystem.readdir(
          path.dirname(requestPath),
          (error, results) => {
            if (error) {
              callback();
              return;
            }

            const basename = path.basename(requestPath);
            const name = basename.replace(/\.[^.]+$/, '');
            const type = path.extname(requestPath).substring(1);
            const files = ((results as Array<string | Buffer>)?.filter(
              (result) => typeof result === 'string'
            ) ?? []) as string[];

            let resolved = files.includes(basename) ? requestPath : undefined;

            if (!resolved) {
              const map = AssetResolver.collectScales(files, {
                name,
                type,
                platform,
              });
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

            const resolvedFile = {
              ...request,
              path: resolved,
              relativePath:
                request.relativePath &&
                resolver.join(request.relativePath, resolved),
              file: true,
            };

            logger.debug('Asset resolved:', requestPath, '->', resolved);

            callback(null, resolvedFile);
          }
        );
      });
  }
}
