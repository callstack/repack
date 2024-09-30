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
      __webpack_require__.repack.loadScript(chunkId, $caller$, done);
    } else {
      __webpack_require__.repack.loadHotUpdate(url, done);
    }
  };
};
