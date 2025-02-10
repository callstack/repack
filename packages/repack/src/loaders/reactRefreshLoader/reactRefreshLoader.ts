import type { LoaderContext } from '@rspack/core';
import dedent from 'dedent';

const reactRefreshFooter = dedent(`
  function $RefreshSig$() {
    return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
  }

  function $RefreshReg$(type, id) {
    $ReactRefreshRuntime$.register(type, __webpack_module__.id + "_" + id);
  }

  if (typeof setImmediate !== "undefined") {
    Promise.resolve().then(function() {
      $ReactRefreshRuntime$.refresh(__webpack_module__.id, __webpack_module__.hot);
    });
  }
`);

export const raw = false;

/**
 * This loader adds React Refresh signatures to the source files, which enables Hot Module Replacement (HMR)
 * for React components. It appends necessary runtime code to register and refresh React components.
 *
 * Works the same as 'builtin:react-refresh-loader' from '@rspack/plugin-react-refresh'
 * but accounts for React Native runtime specifics.
 *
 * Reference implementation: https://github.com/web-infra-dev/rspack/blob/main/crates/rspack_loader_react_refresh/src/lib.rs
 */
export default function reactRefreshLoader(
  this: LoaderContext,
  originalSource: string,
  sourceMap: any,
  meta: any
) {
  this.cacheable();
  const callback = this.async();

  const source = `${originalSource}\n\n${reactRefreshFooter}`;

  callback(null, source, sourceMap, meta);
}
