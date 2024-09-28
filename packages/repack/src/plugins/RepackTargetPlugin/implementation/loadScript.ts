/* eslint-disable @typescript-eslint/no-unused-vars */

let $loadScript$: (
  url: string,
  done: (event?: LoadScriptEvent) => void,
  key?: string,
  chunkId?: string
) => void;
let $caller$ = '';

module.exports = function () {
  $loadScript$ = function loadScript(url, done, key, chunkId) {
    if (key && chunkId) {
      __webpack_require__.repack.loadScript(chunkId, $caller$, done);
    } else {
      // Load HMR update
      __webpack_require__.repack.loadHotUpdate(url, done);
    }
  };
};
