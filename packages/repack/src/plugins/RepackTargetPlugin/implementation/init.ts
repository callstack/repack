var $globalObject$: Record<string, any>;

module.exports = function () {
  var repackRuntime: RepackRuntime = {
    shared: ($globalObject$.__repack__ && $globalObject$.__repack__.shared) ||
      (__webpack_require__.repack && __webpack_require__.repack.shared) || {
        scriptManager: undefined,
      },
  };

  __webpack_require__.repack = $globalObject$.__repack__ = repackRuntime;
};
