import { randomUUID } from 'node:crypto';
import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';

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

/**
 * Creates the snippet that registers the Debug ID on the global object.
 *
 * Mirrors what `@sentry/bundler-plugin-core` injects, so the Sentry SDK picks the id up at
 * runtime without any additional configuration.
 */
function getDebugIdSnippet(debugId: string) {
  return `;{try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:{};var n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="${debugId}",e._sentryDebugIdIdentifier="sentry-dbid-${debugId}")}catch(e){}}\n`;
}

/**
 * Plugin for stamping a Sentry Debug ID into the bundle and its source map.
 *
 * A Debug ID is a UUID present in both artifacts. Sentry uses it to pair a JS stack trace with
 * the source map that resolves it, which is what Metro provides through
 * `@sentry/react-native`'s `createSentryMetroSerializer`.
 *
 * `@sentry/webpack-plugin` cannot fill this role for React Native: it injects through a
 * `BannerPlugin` whose `include` only matches `.js`-like filenames, so it skips `index.bundle`,
 * and it writes the Debug ID only into the source map copy it uploads, never into the emitted
 * asset that `@sentry/react-native`'s Gradle and Xcode scripts read.
 *
 * @example Usage in Rspack config (ESM):
 * ```ts
 * import * as Repack from '@callstack/repack';
 *
 * export default (env) => ({
 *   plugins: [new Repack.SentryDebugIdPlugin()],
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
    const logger = compiler.getInfrastructureLogger(
      'RepackSentryDebugIdPlugin'
    );
    const { BannerPlugin, Compilation, sources } = compiler.webpack;
    const test = this.config.test ?? DEFAULT_TEST;
    const debugIdsByChunk = new Map<string, string>();

    const getDebugId = (name: string) => {
      let debugId = debugIdsByChunk.get(name);
      if (!debugId) {
        debugId = randomUUID();
        debugIdsByChunk.set(name, debugId);
      }
      return debugId;
    };

    new BannerPlugin({
      raw: true,
      include: test,
      banner: ({ chunk }) => {
        const name = chunk?.name ?? chunk?.id?.toString() ?? 'main';
        return getDebugIdSnippet(getDebugId(name));
      },
    }).apply(compiler);

    compiler.hooks.thisCompilation.tap(
      'RepackSentryDebugIdPlugin',
      (compilation) => {
        // Source maps are emitted during the devtool stage, so stamp them once that has run.
        compilation.hooks.processAssets.tap(
          {
            name: 'RepackSentryDebugIdPlugin',
            stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
          },
          (assets) => {
            for (const chunk of compilation.chunks) {
              const name = chunk.name ?? chunk.id?.toString() ?? 'main';
              const debugId = debugIdsByChunk.get(name);
              if (!debugId) {
                continue;
              }

              for (const file of chunk.auxiliaryFiles) {
                if (!file.endsWith('.map') || !assets[file]) {
                  continue;
                }

                let sourceMap: Record<string, unknown>;
                try {
                  sourceMap = JSON.parse(assets[file].source().toString());
                } catch {
                  logger.warn(`Could not parse ${file}, skipping Debug ID.`);
                  continue;
                }

                // Sentry's tooling reads either spelling depending on version, so write both.
                sourceMap.debugId = debugId;
                sourceMap.debug_id = debugId;

                compilation.updateAsset(
                  file,
                  new sources.RawSource(JSON.stringify(sourceMap))
                );
              }
            }
          }
        );
      }
    );
  }
}
