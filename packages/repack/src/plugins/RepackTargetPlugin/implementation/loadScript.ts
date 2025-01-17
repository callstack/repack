var $caller$: string;
var $hmrEnabled$: boolean;
var $loadScript$: RepackRuntimeGlobals.WebpackLoadScript;

module.exports = function () {
  function loadScriptHandler(
    name: string,
    caller: string | undefined,
    done: (event?: RepackRuntimeGlobals.LoadScriptEvent) => void,
    referenceUrl: string
  ) {
    if (__webpack_require__.repack.shared.scriptManager) {
      __webpack_require__.repack.shared.scriptManager
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

  function loadHotUpdateHandler(
    url: string,
    done: (event?: RepackRuntimeGlobals.LoadScriptEvent) => void
  ) {
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
          if (__webpack_require__.repack.shared.scriptManager) {
            __webpack_require__.repack.shared.scriptManager.unstable_evaluateScript(
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

  $loadScript$ = function loadScript(
    url: string,
    done: (event?: RepackRuntimeGlobals.LoadScriptEvent) => void,
    key?: string,
    chunkId?: string
  ) {
    if (key && chunkId) {
      loadScriptHandler(chunkId, $caller$, done, url);
    } else if (key) {
      // MF2 containers
      loadScriptHandler(key, undefined, done, url);
    } else {
      loadHotUpdateHandler(url, done);
    }
  };
};
