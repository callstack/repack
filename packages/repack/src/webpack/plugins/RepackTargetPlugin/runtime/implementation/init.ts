/* eslint-disable no-restricted-globals */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/no-callback-in-promise */
/* eslint-env browser */
/* global LoadScriptEvent RepackRuntime __webpack_require__ */

const $chunkId$ = '';
const $chunkLoadingGlobal$ = '';
const $globalObject$ = {} as Record<string, any>;
const $hmrEnabled$ = false;

module.exports = function () {
  var loadScriptCallback: string[] = [];

  (function () {
    function repackLoadScriptCallback(
      parentPush: (data: string) => void,
      data: string
    ) {
      if (parentPush) {
        parentPush(data);
      }
      var chunkIds = data[0];
      var i = 0;
      for (; i < chunkIds.length; i++) {
        loadScriptCallback.push(chunkIds[i]);
      }
    }

    var chunkLoadingGlobal = ($globalObject$[$chunkLoadingGlobal$] =
      $globalObject$[$chunkLoadingGlobal$] || []);
    chunkLoadingGlobal.push = repackLoadScriptCallback.bind(
      null,
      chunkLoadingGlobal.push.bind(chunkLoadingGlobal)
    );
  })();

  (function () {
    function repackScriptStartup() {
      repackRuntime.loadScriptCallback.push($chunkId$);
    }

    var startupFunctions: Function[] = __webpack_require__.x
      ? [__webpack_require__.x, repackScriptStartup]
      : [repackScriptStartup];

    function startupFunction(this: any) {
      var results;
      for (var i = 0; i < startupFunctions.length; i++) {
        results = startupFunctions[i].apply(this, arguments);
      }
      return results;
    }

    Object.defineProperty(__webpack_require__, 'x', {
      get() {
        return startupFunction;
      },
      set(fn) {
        startupFunctions.push(fn);
      },
    });
  })();

  function loadScript(
    name: string,
    caller: string | undefined,
    done: (event?: LoadScriptEvent) => void
  ) {
    if (repackRuntime.scriptManager) {
      repackRuntime.scriptManager
        .loadScript(name, caller)
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
          // @ts-ignore
          const globalEvalWithSourceUrl = self.globalEvalWithSourceUrl;
          (function () {
            if (globalEvalWithSourceUrl) {
              globalEvalWithSourceUrl(script, null);
            } else {
              eval(script);
            }
          }.call(self));
          done();
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

  var repackRuntime: RepackRuntime = {
    loadScript,
    loadHotUpdate,
    loadScriptCallback,
    scriptManager: undefined,
  };

  __webpack_require__.repack = $globalObject$.__repack__ = repackRuntime;
};
