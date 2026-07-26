/**
 * Vendored from @rspack/plugin-react-refresh@2.0.2 (client runtime files),
 * which is itself based on @pmmmwh/react-refresh-webpack-plugin.
 *
 * Used by the manual React Refresh wiring in DevelopmentPlugin for
 * webpack and Rspack 1 compilers - under Rspack 2 the official
 * @rspack/plugin-react-refresh plugin provides these files instead.
 *
 * MIT Licensed
 * Copyright (c) 2019 Michael Mok (react-refresh-webpack-plugin)
 * Copyright (c) 2022-present Bytedance, Inc. and its affiliates (rspack-plugin-react-refresh)
 */

import { injectIntoGlobalHook } from 'react-refresh/runtime';

const safeThis = (() => {
  const check = (it) => it && it.Math === Math && it;

  // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
  // eslint-disable-next-line es/no-global-this -- safe
  return (
    check(typeof globalThis === 'object' && globalThis) ||
    check(typeof window === 'object' && window) ||
    // eslint-disable-next-line no-restricted-globals -- safe
    check(typeof self === 'object' && self) ||
    check(typeof __webpack_require__.g === 'object' && __webpack_require__.g) ||
    // eslint-disable-next-line no-new-func -- fallback
    (function () {
      return this;
    })() ||
    this ||
    Function('return this')()
  );
})();

if (process.env.NODE_ENV !== 'production') {
  if (typeof safeThis !== 'undefined') {
    let $RefreshInjected$ = '__reactRefreshInjected';
    // Namespace the injected flag (if necessary) for monorepo compatibility
    if (
      typeof __react_refresh_library__ !== 'undefined' &&
      __react_refresh_library__
    ) {
      $RefreshInjected$ += `_${__react_refresh_library__}`;
    }

    // Only inject the runtime if it hasn't been injected
    if (!safeThis[$RefreshInjected$]) {
      injectIntoGlobalHook(safeThis);

      // Empty implementation to avoid "ReferenceError: variable is not defined" in module which didn't pass builtin:react-refresh-loader
      safeThis.$RefreshSig$ = () => (type) => type;
      safeThis.$RefreshReg$ = () => {};

      // Mark the runtime as injected to prevent double-injection
      safeThis[$RefreshInjected$] = true;
    }
  }
}
