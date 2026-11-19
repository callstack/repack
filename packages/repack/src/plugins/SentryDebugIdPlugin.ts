import { createHash } from 'node:crypto';
import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';

import { addDebugIdToSourceMap } from './utils/sourceMapDebugId.js';

/**
 * {@link SentryDebugIdPlugin} configuration options.
 */
export interface SentryDebugIdPluginConfig {
  /**
   * Matches the bundles that should receive a Debug ID.
   *
   * @default /\.([cm]?jsx?|bundle)$/
   */
  test?: RegExp;
}

const DEFAULT_TEST = /\.([cm]?jsx?|bundle)$/;

const PLUGIN_NAME = 'RepackSentryDebugIdPlugin';

/**
 * Creates the snippet that registers the Debug ID on the global object.
 *
 * The body is copied from `@sentry/bundler-plugin-core`, so the Sentry SDK picks the id up at
 * runtime. Diff against it when Sentry changes the format.
 */
function getDebugIdSnippet(debugId: string) {
  return `;{try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:{};var n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="${debugId}",e._sentryDebugIdIdentifier="sentry-dbid-${debugId}")}catch(e){}}\n`;
}

/**
 * Turns a string into a UUID the same way `stringToUUID` in `@sentry/bundler-plugin-core` does,
 * so the same input always gets the same Debug ID.
 */
function stringToUUID(value: string) {
  const hash = createHash('sha256').update(value).digest('hex');
  const variant = ['8', '9', 'a', 'b'][hash.charCodeAt(16) % 4];
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    `4${hash.substring(13, 16)}`,
    `${variant}${hash.substring(17, 20)}`,
    hash.substring(20, 32),
  ].join('-');
}

/**
 * Plugin for stamping a Sentry Debug ID into the bundle and its source map.
 *
 * A Debug ID is a UUID present in both artifacts. Sentry uses it to pair a JS stack trace with
 * the source map that resolves it, which is what Metro provides through
 * `@sentry/react-native`'s `createSentryMetroSerializer`.
 *
 * `@sentry/webpack-plugin` cannot fill this role for React Native: it only processes `.js`-like
 * filenames, so it skips `index.bundle` and its source map.
 *
 * The plugin only runs in `production` mode, like `createSentryMetroSerializer`, which skips
 * development builds.
 *
 * @example Usage in Rspack config (ESM):
 * ```ts
 * import * as Repack from '@callstack/repack';
 *
 * export default (env) => ({
 *   plugins: [new Repack.plugins.SentryDebugIdPlugin()],
 * });
 * ```
 *
 * @category Webpack Plugin
 */
export class SentryDebugIdPlugin {
  constructor(private config: SentryDebugIdPluginConfig = {}) {}

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;
    const logger = compiler.getInfrastructureLogger(PLUGIN_NAME);

    // Plugins are applied before config defaults, and an unset mode means production.
    if ((compiler.options.mode ?? 'production') !== 'production') {
      logger.debug('Skipping Debug IDs outside of production mode.');
      return;
    }

    const { Compilation, sources } = compiler.webpack;
    const test = this.config.test ?? DEFAULT_TEST;

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      // Scoped to the compilation, so watch rebuilds never reuse a stale id.
      const debugIds = new Map<string, string>();

      // Inject before minification and source map generation, so the snippet is minified with the
      // bundle and the maps account for it. The id comes from the chunk's pre-injection hash,
      // since a hash of the output would depend on the id it contains.
      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        () => {
          for (const chunk of compilation.chunks) {
            for (const file of chunk.files) {
              const asset = compilation.getAsset(file);
              if (!asset || !test.test(file)) {
                continue;
              }

              const debugId = stringToUUID(
                chunk.contentHash.javascript ??
                  chunk.hash ??
                  asset.source.source().toString()
              );
              debugIds.set(file, debugId);

              compilation.updateAsset(
                file,
                (source) =>
                  new sources.ConcatSource(getDebugIdSnippet(debugId), source)
              );
            }
          }
        }
      );

      // Stamp the maps right after the devtool stage emits them, so later stages, like content
      // hashing, see the final assets.
      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING + 1,
        },
        () => {
          for (const [file, debugId] of debugIds) {
            const asset = compilation.getAsset(file);
            if (!asset) {
              continue;
            }

            // `sentry-cli` pairs the bundle with its map through this comment, which matters for
            // JSC builds and for uploads outside the Gradle and Xcode scripts.
            const code = asset.source.source().toString();
            const sourceMappingURLIndex = code.lastIndexOf(
              '//# sourceMappingURL='
            );
            compilation.updateAsset(file, (source) => {
              const updated = new sources.ReplaceSource(source);
              if (sourceMappingURLIndex === -1) {
                updated.insert(code.length, `\n//# debugId=${debugId}\n`);
              } else {
                updated.insert(
                  sourceMappingURLIndex,
                  `//# debugId=${debugId}\n`
                );
              }
              return updated;
            });

            const related = asset.info.related?.sourceMap;
            const mapFile = [
              ...(Array.isArray(related) ? related : [related]),
              `${file}.map`,
            ].find(
              (name): name is string => !!name && !!compilation.getAsset(name)
            );
            if (!mapFile) {
              continue;
            }

            let sourceMap: string;
            try {
              sourceMap = addDebugIdToSourceMap(
                compilation.getAsset(mapFile)!.source.source().toString(),
                debugId
              );
            } catch {
              logger.warn(`Could not parse ${mapFile}, skipping Debug ID.`);
              continue;
            }

            compilation.updateAsset(mapFile, new sources.RawSource(sourceMap));
          }
        }
      );
    });
  }
}
