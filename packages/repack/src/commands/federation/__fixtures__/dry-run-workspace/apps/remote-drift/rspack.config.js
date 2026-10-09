// Drifting remote stub: same shared declaration, but this app root has an
// older react installed — the divergence --dry-run must catch pre-build.
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
      name: 'store',
      shared: {
        react: { singleton: true, eager: false, version: '9.9.9' },
      },
    }),
  ],
});
