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

/* global __webpack_require__ */
import {
  getFamilyByType,
  isLikelyComponentType,
  performReactRefresh,
  register,
} from 'react-refresh/runtime';

/**
 * Extracts exports from a Rspack module object.
 * @param {string} moduleId An Rspack module ID.
 * @returns {*} An exports object from the module.
 */
function getModuleExports(moduleId) {
  if (typeof moduleId === 'undefined') {
    // `moduleId` is unavailable, which indicates that this module is not in the cache,
    // which means we won't be able to capture any exports,
    // and thus they cannot be refreshed safely.
    // These are likely runtime or dynamically generated modules.
    return {};
  }

  const maybeModule = __webpack_require__.c[moduleId];
  if (typeof maybeModule === 'undefined') {
    // `moduleId` is available but the module in cache is unavailable,
    // which indicates the module is somehow corrupted (e.g. broken Rspack `module` globals).
    // We will warn the user (as this is likely a mistake) and assume they cannot be refreshed.
    console.warn(
      `[React Refresh] Failed to get exports for module: ${moduleId}.`
    );
    return {};
  }

  const exportsOrPromise = maybeModule.exports;
  if (typeof Promise !== 'undefined' && exportsOrPromise instanceof Promise) {
    return exportsOrPromise.then((moduleExports) => moduleExports);
  }

  return exportsOrPromise;
}

/**
 * Calculates the signature of a React refresh boundary.
 * If this signature changes, it's unsafe to accept the boundary.
 *
 * This implementation is based on the one in [Metro](https://github.com/facebook/metro/blob/907d6af22ac6ebe58572be418e9253a90665ecbd/packages/metro/src/lib/polyfills/require.js#L795-L816).
 * @param {*} moduleExports An Rspack module exports object.
 * @returns {string[]} A React refresh boundary signature array.
 */
function getReactRefreshBoundarySignature(moduleExports) {
  const signature = [getFamilyByType(moduleExports)];

  if (moduleExports == null || typeof moduleExports !== 'object') {
    // Exit if we can't iterate over exports.
    return signature;
  }

  for (const key in moduleExports) {
    if (key === '__esModule') {
      continue;
    }

    signature.push(key);
    signature.push(getFamilyByType(moduleExports[key]));
  }

  return signature;
}

/**
 * Creates a helper that performs a delayed React refresh.
 * @returns {function(function(): void): void} A debounced React refresh function.
 */
function createDebounceUpdate() {
  /**
   * A cached setTimeout handler.
   * @type {number | undefined}
   */
  let refreshTimeout;

  /**
   * Performs React Refresh on a delay.
   * @param {function(): void} [callback]
   * @returns {void}
   */
  const enqueueUpdate = (callback) => {
    if (typeof refreshTimeout !== 'undefined') {
      return;
    }

    refreshTimeout = setTimeout(() => {
      refreshTimeout = undefined;
      performReactRefresh();
      if (callback) {
        callback();
      }
    }, 30);
  };

  return enqueueUpdate;
}

/**
 * Checks if all exports are likely a React component.
 *
 * This implementation is based on the one in [Metro](https://github.com/facebook/metro/blob/febdba2383113c88296c61e28e4ef6a7f4939fda/packages/metro/src/lib/polyfills/require.js#L748-L774).
 * @param {*} moduleExports An Rspack module exports object.
 * @returns {boolean} Whether the exports are React component like.
 */
function isReactRefreshBoundary(moduleExports) {
  if (isLikelyComponentType(moduleExports)) {
    return true;
  }
  if (
    moduleExports === undefined ||
    moduleExports === null ||
    typeof moduleExports !== 'object'
  ) {
    // Exit if we can't iterate over exports.
    return false;
  }

  let hasExports = false;
  let areAllExportsComponents = true;
  for (const key in moduleExports) {
    hasExports = true;

    // This is the ES Module indicator flag
    if (key === '__esModule') {
      continue;
    }

    // We can (and have to) safely execute getters here,
    // as Rspack/webpack manually assigns ESM exports to getters,
    // without any side-effects attached.
    // Ref: https://github.com/webpack/webpack/blob/b93048643fe74de2a6931755911da1212df55897/lib/MainTemplate.js#L281
    const exportValue = moduleExports[key];
    if (!isLikelyComponentType(exportValue)) {
      areAllExportsComponents = false;
    }
  }

  return hasExports && areAllExportsComponents;
}

/**
 * Checks if exports are likely a React component and registers them.
 *
 * This implementation is based on the one in [Metro](https://github.com/facebook/metro/blob/febdba2383113c88296c61e28e4ef6a7f4939fda/packages/metro/src/lib/polyfills/require.js#L818-L835).
 * @param {*} moduleExports An Rspack module exports object.
 * @param {string} moduleId An Rspack module ID.
 * @returns {void}
 */
function registerExportsForReactRefresh(moduleExports, moduleId) {
  if (isLikelyComponentType(moduleExports)) {
    // Register module.exports if it is likely a component
    register(moduleExports, `${moduleId} %exports%`);
  }

  if (
    moduleExports === undefined ||
    moduleExports === null ||
    typeof moduleExports !== 'object'
  ) {
    // Exit if we can't iterate over the exports.
    return;
  }

  for (const key in moduleExports) {
    // Skip registering the ES Module indicator
    if (key === '__esModule') {
      continue;
    }

    const exportValue = moduleExports[key];
    if (isLikelyComponentType(exportValue)) {
      const typeID = `${moduleId} %exports% ${key}`;
      register(exportValue, typeID);
    }
  }
}

/**
 * Compares previous and next module objects to check for mutated boundaries.
 *
 * This implementation is based on the one in [Metro](https://github.com/facebook/metro/blob/907d6af22ac6ebe58572be418e9253a90665ecbd/packages/metro/src/lib/polyfills/require.js#L776-L792).
 * @param {*} prevExports The current Rspack module exports object.
 * @param {*} nextExports The next Rspack module exports object.
 * @returns {boolean} Whether the React refresh boundary should be invalidated.
 */
function shouldInvalidateReactRefreshBoundary(prevExports, nextExports) {
  const prevSignature = getReactRefreshBoundarySignature(prevExports);
  const nextSignature = getReactRefreshBoundarySignature(nextExports);

  return (
    prevSignature.length !== nextSignature.length ||
    nextSignature.some(
      (signatureItem, index) => prevSignature[index] !== signatureItem
    )
  );
}

const enqueueUpdate = createDebounceUpdate();

function executeRuntime(moduleExports, moduleId, hot, isTest) {
  registerExportsForReactRefresh(moduleExports, moduleId);

  if (hot) {
    const isHotUpdate = Boolean(hot.data);
    let prevExports;
    if (isHotUpdate) {
      prevExports = hot.data.prevExports;
    }

    if (isReactRefreshBoundary(moduleExports)) {
      /**
       * A callback to perform a full refresh if React has unrecoverable errors,
       * and also caches the to-be-disposed module.
       * @param {*} data A hot module data object from Rspack HMR.
       * @returns {void}
       */
      const hotDisposeCallback = (data) => {
        // We have to mutate the data object to get data registered and cached
        data.prevExports = moduleExports;
      };
      /**
       * An error handler to allow self-recovering behaviors.
       * @param {Error} error An error occurred during evaluation of a module.
       * @returns {void}
       */
      const hotErrorHandler = (error) => {
        console.error(error);
        if (
          __reload_on_runtime_errors__ &&
          isUnrecoverableRuntimeError(error)
        ) {
          location.reload();
          return;
        }

        if (
          typeof isTest !== 'undefined' &&
          isTest &&
          window.onHotAcceptError
        ) {
          window.onHotAcceptError(error.message);
        }

        __webpack_require__.c[moduleId].hot.accept(hotErrorHandler);
      };

      hot.dispose(hotDisposeCallback);
      hot.accept(hotErrorHandler);

      if (isHotUpdate) {
        if (
          isReactRefreshBoundary(prevExports) &&
          shouldInvalidateReactRefreshBoundary(prevExports, moduleExports)
        ) {
          hot.invalidate();
        } else {
          enqueueUpdate();
        }
      }
    } else {
      if (isHotUpdate && typeof prevExports !== 'undefined') {
        hot.invalidate();
      }
    }
  }
}

function isUnrecoverableRuntimeError(error) {
  return error.message.startsWith('RuntimeError: factory is undefined');
}

export {
  enqueueUpdate,
  executeRuntime,
  getModuleExports,
  isReactRefreshBoundary,
  registerExportsForReactRefresh,
  shouldInvalidateReactRefreshBoundary,
};
