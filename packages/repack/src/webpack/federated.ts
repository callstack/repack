import { URL } from 'url';
import dedent from 'dedent';

/**
 * Namespace for utilities for Module Federation.
 */
export namespace Federated {
  /**
   * Creates JavaScript loading code for the given Module Federation remote
   * allowing to import that remote without creating an async boundary, but with
   * simple import statement, eg: `import MyComponent from 'my-remote/MyComponent';`.
   *
   * __This function should be used only when using `webpack.container.ModuleFederationPlugin`.__
   * For `Repack.plugins.ModuleFederationPlugin`, `Federated.createRemote` is used under the hood.
   *
   * Remote container will be evaluated only once. If you import module from the same container twice,
   * the container will be loaded and evaluated only on the first import.
   *
   * @param remote Remote name with URL or `dynamic` separated by `@`.
   * @returns A JavaScript loading code the the given remote.
   *
   * @example
   * ```ts
   * import webpack from 'webpack';
   * import * as Repack from '@callstack/repack';
   *
   * export default (env) => {
   *   return {
   *     plugins: [
   *       new webpack.container.ModuleFederationPlugin({
   *         remotes: {
   *           app1: Repack.Federated.createRemote('app1@dynamic'),
   *           app2: Repack.Federated.createRemote('app2@https://example.com/app2.container.bundle'),
   *         },
   *       }),
   *     ],
   *   };
   * };
   * ```
   */
  export function createRemote(remote: string) {
    const [remoteName, url] = remote.split('@');

    if (!url) {
      if (remote.includes('@')) {
        throw new Error(
          'Missing URL after @. Use `dynamic` or provide full URL to container bundle.'
        );
      } else {
        throw new Error(
          'Remote must provide @ with either full URL to container bundle or `dynamic`.'
        );
      }
    }

    const containerUrl = url === 'dynamic' ? undefined : url;
    const chunksUrl =
      url === 'dynamic' ? undefined : new URL('[name][ext]', url).href;

    const defaultResolver = containerUrl
      ? dedent`
          scriptManager.addResolver(function (scriptId, caller) {
            if (scriptId === '${remoteName}') {
              return {
                url: '${containerUrl}',
              };
            }
          }, { priority: 0 });

          scriptManager.addResolver(function (scriptId, caller) {
            if (caller === '${remoteName}') {
              return {
                url: (webpackContext) => '${chunksUrl}'.replace('[name][ext]', webpackContext.u(scriptId)),
              };
            }
          }, { priority: 0 });
        `
      : '';

    return dedent`promise new Promise((resolve, reject) => {
      function resolveRemote() {
        resolve({
          get: (request) => {
            return self.${remoteName}.get(request);
          },
          init: (arg) => {
            if (!self.${remoteName}.__isInitialized) {
              try {
                self.${remoteName}.__isInitialized = true;
                return self.${remoteName}.init(arg);
              } catch (e) {
                console.log('[Repack/Federated] Remote container ${remoteName} already initialized.');
              }
            }
          }
        });
      }

      if (self.${remoteName}) {
        return resolveRemote();
      }
      
      var scriptManager = __webpack_require__.repack.shared.scriptManager;

      ${defaultResolver}

      scriptManager
        .loadScript('${remoteName}', undefined, __webpack_require__)
        .then(function() {
          resolveRemote();
        })
        .catch(function(reason) {
          reject(reason);
        });
    })`;
  }
}
