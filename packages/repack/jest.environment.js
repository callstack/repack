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
 */
class RspackCoreEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    this.global.__RSPACK_CORE__ = await import('@rspack/core');
  }
}

module.exports = RspackCoreEnvironment;
