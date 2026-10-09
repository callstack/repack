// Host bundler config stub for federation-init plan tests.
// Carries a real `remotes: { ... }` block so `ensureRemotesEntry` has an
// anchor to surgically extend, and the plugin shape `extractAppShared`
// duck-types for shared extraction / plugin-version mirroring.
class RepackPlugin {
  constructor(config) {
    this.config = config;
  }
}

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
    new RepackPlugin({}),
    new ModuleFederationPluginV1({
      name: 'HostApp',
      remotes: {
        'remote-drift': 'remote-drift@remote-drift/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, eager: true },
        'react-native': { singleton: true, eager: true },
        '@shopify/flash-list': { singleton: true, eager: true },
        'left-pad': { singleton: true, eager: true },
      },
    }),
  ],
});
