// CJS stub of a federation-init generated remote config (`rspack.<name>.mts`
// in production; `.cjs` so jest can evaluate it). The app dir carries no
// conventional `rspack.config.*` file — extraction must discover this.
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
