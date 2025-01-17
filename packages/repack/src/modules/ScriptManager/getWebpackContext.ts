/**
 * Get Webpack runtime context form current JavaScript scope.
 *
 * __You likely don't need to use it.__
 */
export function getWebpackContext(): RepackRuntimeGlobals.WebpackRequire {
  return __webpack_require__;
}
