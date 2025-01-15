var $globalObject$: Record<string, any>;
var $interceptModuleExecution$: RepackRuntimeGlobals.WebpackModuleExecutionInterceptor;

module.exports = function () {
  // intercept module factory calls to forward errors to global.ErrorUtils
  // aligned with `guardedLoadModule` behaviour in Metro
  // https://github.com/facebook/metro/blob/a4cb0b0e483748ef9f1c760cb60c57e3a84c1afd/packages/metro-runtime/src/polyfills/require.js#L329
  $interceptModuleExecution$.push(function (options) {
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
};
