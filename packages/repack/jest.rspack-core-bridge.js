// Maps `require('@rspack/core')` inside tests onto the module preloaded by
// jest.environment.js. The `__esModule` marker keeps Babel's import interop
// treating it as a namespace, so named imports keep working.
const core = globalThis.__RSPACK_CORE__;

if (!core) {
  throw new Error(
    '@rspack/core was not preloaded by the test environment - ' +
      'make sure jest.environment.js is set as the testEnvironment'
  );
}

module.exports = { __esModule: true, ...core, default: core.default ?? core };
