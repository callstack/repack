const $globalObject$ = {} as Record<string, any>;
const $hmrEnabled$ = false;

module.exports = function () {
  var repackRuntime: RepackRuntime = {
    loadScript,
    loadHotUpdate,
    shared: ($globalObject$.__repack__ && $globalObject$.__repack__.shared) ||
      (__webpack_require__.repack && __webpack_require__.repack.shared) || {
        scriptManager: undefined,
      },
  };

  __webpack_require__.repack = $globalObject$.__repack__ = repackRuntime;

  // intercept module factory calls to forward errors to global.ErrorUtils
  // aligned with `guardedLoadModule` behaviour in Metro
  // https://github.com/facebook/metro/blob/a4cb0b0e483748ef9f1c760cb60c57e3a84c1afd/packages/metro-runtime/src/polyfills/require.js#L329
  __webpack_require__.i.push(function (options) {
    var originalFactory = options.factory;
    options.factory = function (moduleObject, moduleExports, webpackRequire) {
      try {
        originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
      } catch (e) {
        if ($globalObject$.ErrorUtils) {
          // exposed as global early on, part of `@react-native/js-polyfills` error-guard
          // https://github.com/facebook/react-native/blob/4dac99cf6d308e804efc098b37f5c24c1eb611cf/packages/polyfills/error-guard.js#L121
          $globalObject$.ErrorUtils.reportFatalError(e);
        } else {
          // error happened before ErrorUtils was initialized
          // at this point in runtime we can only rethrow the error
          throw e;
        }
      }
    };
  });

  function loadScript(
    name: string,
    caller: string | undefined,
    done: (event?: LoadScriptEvent) => void,
    referenceUrl: string
  ) {
    if (repackRuntime.shared.scriptManager) {
      repackRuntime.shared.scriptManager
        .loadScript(name, caller, __webpack_require__, referenceUrl)
        .then(function () {
          done();
          return;
        })
        .catch(function (reason) {
          console.error('[RepackRuntime] Loading script failed:', reason);
          done({ type: 'exec', target: { src: name } });
        });
    } else {
      console.error('[RepackRuntime] Script manager was not provided');
      done({ type: 'exec', target: { src: name } });
    }
  }

  function loadHotUpdate(url: string, done: (event?: LoadScriptEvent) => void) {
    if (!$hmrEnabled$) {
      console.error('[RepackRuntime] Loading HMR update chunks is disabled');
      done({ type: 'disabled', target: { src: url } });
      return;
    }

    (
      fetch(url).then(function (response) {
        if (!response.ok) {
          console.error(
            '[RepackRuntime] Loading HMR update failed:',
            response.statusText
          );
          done({ type: response.statusText, target: { src: url } });
          return;
        }

        return response.text();
      }) as Promise<string | undefined>
    )
      .then(function (script?: string) {
        if (script) {
          if (repackRuntime.shared.scriptManager) {
            repackRuntime.shared.scriptManager.unstable_evaluateScript(
              script,
              url
            );
          } else {
            eval(script);
          }
        }

        return;
      })
      .catch(function (reason) {
        console.error(
          '[RepackRuntime] Loading HMR update chunk failed:',
          reason
        );
        done({ type: 'exec', target: { src: url } });
      });
  }
};
