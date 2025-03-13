import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';
import type * as RepackClient from '../ScriptManager/index.js';

const RepackPrefetchPlugin: () => FederationRuntimePlugin = () => ({
  name: 'repack-prefetch-plugin',
  // generatePreloadAssets is an AsyncHook so it should
  // override the default implementation from CorePlugin
  generatePreloadAssets: async (args) => {
    const preloadConfig = args.preloadOptions.preloadConfig;
    const remoteSnapshot = args.remoteSnapshot;

    const client = require('../ScriptManager/index.js') as typeof RepackClient;
    const { ScriptManager, getWebpackContext } = client;

    // hacky way to trigger adding resolvers through ResolverPlugin
    await args.origin.remoteHandler.hooks.lifecycle.beforeRequest.emit({
      id: preloadConfig.nameOrAlias,
      origin: args.origin,
      options: args.origin.options,
    });

    if ('modules' in remoteSnapshot) {
      // TODO handle options from preloadConfig
      const assets = remoteSnapshot.modules
        .flatMap((module) => [
          ...module.assets.js.sync,
          ...module.assets.js.async,
        ])
        .map(
          (asset) => () =>
            ScriptManager.shared.prefetchScript(
              asset.split('.')[0],
              remoteSnapshot.globalName,
              getWebpackContext(),
              // @ts-ignore
              remoteSnapshot.publicPath + '/' + asset
            )
        );

      // fetch remote entry container too
      assets.unshift(() =>
        ScriptManager.shared.prefetchScript(
          remoteSnapshot.globalName,
          undefined,
          getWebpackContext(),
          // @ts-ignore
          remoteSnapshot.publicPath + '/' + remoteSnapshot.remoteEntry
        )
      );

      // ScriptManager.shared.on('prefetching', (script) => {
      //   console.log('prefetching', script);
      // });

      await Promise.all(assets.map((asset) => asset()));
    }

    // noop for compatibility
    return Promise.resolve({
      cssAssets: [],
      jsAssetsWithoutEntry: [],
      entryAssets: [],
    });
  },
});

export default RepackPrefetchPlugin;
