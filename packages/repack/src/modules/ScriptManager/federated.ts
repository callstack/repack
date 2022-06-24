import type { WebpackContext } from './types';

/**
 * Namespace for utilities for Module Federation.
 *
 * Refer to {@link Script.federated} for more details.
 */
export namespace Federated {
  /**
   * Resolves URL to a container or a chunk when using Module Federation,
   * based on given `scriptId` and `caller`.
   */
  export type URLResolver = (
    scriptId: string,
    caller?: string
  ) => string | ((webpackContext: WebpackContext) => string) | undefined;

  /**
   * Configuration options for {@link createURLResolver} for Module Federation.
   * Allows to configure how created {@link URLResolver} will behave.
   */
  export interface URLResolverConfig {
    /**
     * A Module Federation container names to URL templates mapping.
     *
     * The key in the object is a container name and the value is a template
     * that will be used to resolve a URL.
     *
     * Accepted template params:
     * - `[name]` - Container name
     * - `[ext]` - Container extension, eg: `.container.bundle`
     *
     * You can omit `[ext]`, if you're using custom extension, in which case, you should
     * provide extension explicitly. When using custom extension, it's recommended to
     * provide a URL template for chunks as well using `chunks` property.
     *
     * @example
     * ```ts
     * {
     *   containers: {
     *     app1: 'http://localhost:9000/[name][ext]'
     *   }
     * }
     * ```
     */
    containers: Record<string, string>;

    /**
     * An optional Module Federation container names to URL templates mapping.
     *
     * The key in the object is a container names and the value is a template
     * that will be used to resolve a __chunk__ URL for that container.
     *
     * Specifying this property is useful if:
     * - containers have custom extension (different from `.container.bundle`)
     * - chunks have custom extensions (different from `.chunk.bundle`)
     * - chunks have different URL that containers
     *
     * When this property is left unspecified, the template URLs are inferred from
     * `containers` property. The following:
     * ```
     * {
     *   containers: {
     *     app1: 'http://localhost:9000/[name][ext]
     *     app2: 'http://localhost:9000/[name].js
     *   },
     * }
     * ```
     * is equivalent to:
     * ```ts
     * {
     *   containers: {
     *     app1: 'http://localhost:9000/[name][ext]',
     *     app2: 'http://localhost:9000/[name].js',
     *   },
     *   chunks: {
     *     app1: 'http://localhost:9000/[name][ext]',
     *     app2: 'http://localhost:9000/[name].js',
     *   },
     * }
     * ```
     *
     * Accepted template params:
     * - `[name]` - Container name
     * - `[ext]` - Chunk extension, eg: `.chunk.bundle`
     *
     * @example
     * ```ts
     * {
     *   containers: {
     *     app1: 'http://localhost:9000/[name].container.js',
     *   },
     *   chunks: {
     *     app1: 'http://localhost:9000/chunks/[name][ext]',
     *   }
     * }
     * ```
     */
    chunks?: Record<string, string>;
  }

  /**
   * Creates URL resolver for Module Federation from provided config.
   *
   * @example
   * ```ts
   * import { ScriptManager, Script } from '@callstack/repack/client';
   *
   * const resolveURL = Script.federated.createURLResolver({
   *   containers: {
   *     app1: 'http://localhost:9001/[name][ext]',
   *     app2: 'http://localhost:9002/[name].container.js',
   *   },
   *   chunks: {
   *     app2: 'http://localhost:9002/chunks/[name][ext]',
   *   },
   * });
   *
   * new ScriptManager({
   *   resolve: async (scriptId, caller) => {
   *     let url;
   *     if (caller === 'main') {
   *       url = __DEV__
   *         ? Script.getDevServerURL(scriptId)
   *         : Script.getRemoteURL(`http://localhost:9000/${scriptId}`);
   *     } else {
   *       url = resolveURL(scriptId, caller);
   *     }
   *
   *     return {
   *       url,
   *       query: {
   *         platform: Platform.OS,
   *       },
   *     };
   *   },
   * });
   * ```
   *
   * `createURLResolver` is a abstraction over {@link Script.getRemoteURL},
   * for example:
   * ```ts
   * import { ScriptManager, Script } from '@callstack/repack/client';
   *
   * new ScriptManager({
   *   resolve: async (scriptId, caller) => {
   *     const resolveURL = Script.federated.createURLResolver({
   *       containers: {
   *         app1: 'http://localhost:9000/[name][ext]',
   *       },
   *     });
   *
   *     return {
   *       url: resolveURL(scriptId, caller);
   *     };
   *   },
   * });
   * ```
   * is equivalent to:
   * ```ts
   * import { ScriptManager, Script } from '@callstack/repack/client';
   *
   * new ScriptManager({
   *   resolve: async (scriptId, caller) => {
   *     if (scriptId === 'app1') {
   *       return {
   *         url: 'http://localhost:9000/app1.container.bundle',
   *       };
   *     }
   *
   *     if (caller === 'app1') {
   *       return {
   *         url: Script.getRemoteURL(`http://localhost:9000/${scriptId}`),
   *       };
   *     }
   *   },
   * });
   * ```
   *
   * @param config Configuration for the resolver.
   * @returns A resolver function which will try to resolve URL based on given `scriptId` and `caller`.
   */
  export function createURLResolver(
    config: Federated.URLResolverConfig
  ): Federated.URLResolver {
    const resolvers: Record<string, Federated.URLResolver> = {};

    for (const key in config.containers) {
      resolvers[key] = (scriptId: string, caller?: string) => {
        if (scriptId === key) {
          const url = config.containers[key]
            .replace(/\[name\]/g, scriptId)
            .replace(/\[ext\]/g, '.container.bundle');
          return url;
        }

        if (caller === key) {
          const url = (config.chunks?.[key] ?? config.containers[key]).replace(
            /\[name\]/g,
            scriptId
          );

          if (url.includes('[ext]')) {
            return (webpackContext: WebpackContext) =>
              webpackContext.u(url.replace(/\[ext\]/g, ''));
          }

          return url;
        }

        return undefined;
      };
    }

    return (scriptId, caller) => {
      const resolver =
        (caller ? resolvers[caller] : undefined) ?? resolvers[scriptId];

      return resolver(scriptId, caller);
    };
  }
}
