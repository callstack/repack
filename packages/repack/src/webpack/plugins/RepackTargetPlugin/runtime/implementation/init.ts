/* eslint-disable no-restricted-globals */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/no-callback-in-promise */
/* eslint-env browser */
/* global LoadScriptEvent RepackRuntime __webpack_require__ */

const $chunkId$ = '';
const $chunkLoadingGlobal$ = '';
const $globalObject$ = {} as Record<string, any>;
const $hmrEnabled$ = false;

module.exports = function () {
  var repackRuntime: RepackRuntime = {
    loadScript,
    loadHotUpdate,
    shared: ($globalObject$.__repack__ && $globalObject$.__repack__.shared) ||
      (__webpack_require__.repack && __webpack_require__.repack.shared) || {
        loadScriptCallback: [[$chunkId$]],
        scriptManager: undefined,
      },
  };

  __webpack_require__.repack = $globalObject$.__repack__ = repackRuntime;

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
        repackRuntime.shared.loadScriptCallback.push([chunkIds[i], $chunkId$]);
      }
    }

    var chunkLoadingGlobal = ($globalObject$[$chunkLoadingGlobal$] =
      $globalObject$[$chunkLoadingGlobal$] || []);
    chunkLoadingGlobal.push = repackLoadScriptCallback.bind(
      null,
      chunkLoadingGlobal.push.bind(chunkLoadingGlobal)
    );
  })();

  function loadScript(
    name: string,
    caller: string | undefined,
    done: (event?: LoadScriptEvent) => void
  ) {
    if (repackRuntime.shared.scriptManager) {
      repackRuntime.shared.scriptManager
        .loadScript(name, caller, __webpack_require__)
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
              globalEvalWithSourceUrl(script, url);
            } else {
              eval(script);
            }
          }).call(self);
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
};
