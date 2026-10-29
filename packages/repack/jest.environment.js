const { TestEnvironment: NodeEnvironment } = require('jest-environment-node');

/**
 * @rspack/core is published as a pure ESM package, which Jest's sandboxed CJS
 * module runtime cannot load. Test environments run outside the sandbox, with
 * Node's real module system, so load it here and hand it to the sandbox via a
 * global - see jest.rspack-core-bridge.js for the consuming side.
 */
class RspackCoreEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    this.global.__RSPACK_CORE__ = await import('@rspack/core');
  }
}

module.exports = RspackCoreEnvironment;
