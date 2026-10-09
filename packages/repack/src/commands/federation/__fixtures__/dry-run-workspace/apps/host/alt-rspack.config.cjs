// --config flag target proving the flag wins over discovered configs.
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
      name: 'override',
      shared: {
        react: { singleton: true, eager: true, version: '9.9.9' },
      },
    }),
  ],
});
