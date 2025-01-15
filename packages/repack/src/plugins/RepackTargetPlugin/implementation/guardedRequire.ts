var $globalObject$: Record<string, any>;

module.exports = function () {
  // This flag prevents nested error handling when __webpack_require__
  // is called from within another __webpack_require__ call.
  var inGuard = false;
  var originalWebpackRequire = __webpack_require__;

  // wrap __webpack_require__ calls to forward errors to global.ErrorUtils
  // aligned with `guardedLoadModule` behaviour in Metro
  // https://github.com/facebook/metro/blob/a4cb0b0e483748ef9f1c760cb60c57e3a84c1afd/packages/metro-runtime/src/polyfills/require.js#L329
  function guardedWebpackRequire(moduleId: string) {
    if (!inGuard && $globalObject$.ErrorUtils) {
      inGuard = true;
      let exports;
      try {
        exports = originalWebpackRequire(moduleId);
      } catch (e) {
        // exposed as global early on, part of `@react-native/js-polyfills` error-guard
        // https://github.com/facebook/react-native/blob/4dac99cf6d308e804efc098b37f5c24c1eb611cf/packages/polyfills/error-guard.js#L121
        $globalObject$.ErrorUtils.reportFatalError(e);
      }
      inGuard = false;
      return exports;
    } else {
      return originalWebpackRequire(moduleId);
    }
  }

  // Copy all properties from the original function to the wrapped function
  Object.getOwnPropertyNames(originalWebpackRequire).forEach((key) => {
    // @ts-ignore
    guardedWebpackRequire[key] = originalWebpackRequire[key];
  });

  // @ts-ignore
  // replace __webpack_require__ with the wrapped version
  __webpack_require__ = guardedWebpackRequire;
};
