// Remote stub aligned with the host: react 9.9.9 installed, lazy eager
// (the remote side of the host-eager/remote-lazy convention).
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
      name: 'catalog',
      shared: {
        react: { singleton: true, eager: false, version: '9.9.9' },
      },
    }),
  ],
});
