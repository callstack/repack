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
   * The returned code should be put as a value inside `remotes` object when configuring
   * `webpack.container.ModuleFederationPlugin`.
   *
   * Remote container will be evaluated only once. If you import module from the same container twice,
   * the container will be loaded and evaluated only on the first import.
   *
   * @param remoteName Name of the container to create remote for.
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
   *           app1: Repack.Federated.createRemote('app1'),
   *         },
   *       }),
   *     ],
   *   };
   * };
   * ```
   */
  export function createRemote(remoteName: string) {
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
