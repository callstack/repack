// CJS stub of a host bundler config for --dry-run extraction tests.
// Mirrors the plugin shape `extractAppShared` duck-types: an instance with
// getSharedConfiguration() returning the constructor-provided shared option.
class ModuleFederationPluginV1 {
  constructor(config) {
    this.config = config;
  }

  getSharedConfiguration() {
    return this.config.shared;
  }
}

module.exports = () => ({
  plugins: [
    new ModuleFederationPluginV1({
      name: 'shell',
      shared: {
        react: { singleton: true, eager: true, version: '9.9.9' },
      },
    }),
  ],
});
