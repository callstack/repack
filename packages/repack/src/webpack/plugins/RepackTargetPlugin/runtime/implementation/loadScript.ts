/* eslint-disable @typescript-eslint/no-unused-vars */
/* globals LoadScriptEvent __webpack_require__ */

let $loadScript$;
let $caller$ = '';

module.exports = function () {
  $loadScript$ = function loadScript(
    url: string,
    done: (event?: LoadScriptEvent) => void,
    key?: string,
    chunkId?: string
  ) {
    if (key && chunkId) {
      __webpack_require__.repack.loadScript(chunkId, $caller$, done, url);
    } else {
      // Load HMR update
      __webpack_require__.repack.loadHotUpdate(url, done);
    }
  };
};
