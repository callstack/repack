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
  __webpack_require__.i.push(function (options) {
    var originalFactory = options.factory;
    options.factory = function (moduleObject, moduleExports, webpackRequire) {
      try {
        originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
      } catch (e) {
        $globalObject$.ErrorUtils.reportFatalError(e);
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
