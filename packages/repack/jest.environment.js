const { TestEnvironment: NodeEnvironment } = require('jest-environment-node');

/**
 * @rspack/core v2 is published as a pure ESM package, which Jest's sandboxed
 * CJS module runtime cannot load (even `createRequire` inside the sandbox is
 * wrapped by Jest and loops back into the module registry).
 *
 * Test environments are loaded outside the Jest sandbox with Node's real
 * module system, where loading ESM through `require()`/`import()` is
 * supported. Load @rspack/core here and expose it to the sandbox via a
 * global - see jest.rspack-core-bridge.js for the consuming side.
 *
 * The environment is parameterized on RSPACK_MAJOR (default 2) so the suite
 * can run against both supported Rspack majors:
 * - v2: `await import('@rspack/core')` (ESM-only package),
 * - v1: plain `require` of the aliased `@rspack/core-v1` devDependency - the
 *   package is CJS, and requiring it directly sidesteps any reliance on
 *   cjs-module-lexer named-export synthesis.
 * `__RSPACK_MAJOR__` is exposed alongside so tests can gate major-specific
 * assertions.
 */
class RspackCoreEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    const major = Number(process.env.RSPACK_MAJOR ?? '2');
    this.global.__RSPACK_CORE__ =
      major === 1 ? require('@rspack/core-v1') : await import('@rspack/core');
    this.global.__RSPACK_MAJOR__ = major;
  }
}

module.exports = RspackCoreEnvironment;
