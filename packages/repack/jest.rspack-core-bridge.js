// @rspack/core v2 is published as a pure ESM package, which Jest's sandboxed
// CJS module runtime cannot load. The real module is loaded natively by the
// custom test environment (jest.environment.js) and exposed via a global;
// this bridge maps `require('@rspack/core')` inside tests onto it.
//
// The `__esModule` marker keeps Babel's import interop treating this as an
// ESM-like namespace, so named imports (`import { rspack } from '@rspack/core'`)
// keep working.
const core = globalThis.__RSPACK_CORE__;

if (!core) {
  throw new Error(
    '@rspack/core was not preloaded by the test environment - ' +
      'make sure jest.environment.js is set as the testEnvironment'
  );
}

module.exports = { __esModule: true, ...core, default: core.default ?? core };
