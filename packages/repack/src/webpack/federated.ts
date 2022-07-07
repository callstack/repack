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
      var scriptManager = __webpack_require__.repack.shared.scriptManager;
      scriptManager
        .loadScript('${remoteName}', undefined, __webpack_require__)
        .then(function() {
          resolve({
            get: (request) => {
              return self.${remoteName}.get(request);
            },
            init: (arg) => {
              if(!self.${remoteName}._initialized) {
                try {
                  self.${remoteName}._initialized = true;
                  return self.${remoteName}.init(arg);
                } catch (e) {
                  console.log('[Repack/Federated] Remote container ${remoteName} already initialized.');
                }
              }
            }
          });
        })
        .catch(function(reason) {
          reject(reason);
        });
    })`;
  }
}
