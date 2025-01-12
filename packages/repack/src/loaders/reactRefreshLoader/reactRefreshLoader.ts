import type { LoaderContext } from '@rspack/core';
import dedent from 'dedent';

const reactRefreshFooter = dedent(`
  function $RefreshSig$() {
    return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
  }

  function $RefreshReg$(type, id) {
    $ReactRefreshRuntime$.register(type, __webpack_module__.id + "_" + id);
  }

  Promise.resolve().then(function() {
    $ReactRefreshRuntime$.refresh(__webpack_module__.id, __webpack_module__.hot);
  });
`);

export const raw = false;

/**
 * This loader is used in Webpack configuration as a fallback loader for 'builtin:react-refresh-loader' from Rspack.
 * Thanks to this loader, which mimics the one written in Rust, we can utilize "@rspack/plugin-react-refresh" in Webpack as well,
 * instead of relying on "@pmmmwh/react-refresh-webpack-plugin".
 *
 * Reference implementation: https://github.com/web-infra-dev/rspack/blob/main/crates/rspack_loader_react_refresh/src/lib.rs
 */
export default function reactRefreshLoader(
  this: LoaderContext,
  originalSource: string,
  sourceMap: any,
  meta: any
) {
  const callback = this.async();

  const source = `${originalSource}\n\n${reactRefreshFooter}`;

  callback(null, source, sourceMap, meta);
}
