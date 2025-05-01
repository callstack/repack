import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';
import type * as RepackClient from '../ScriptManager/index.js';

interface PrefetchAsset {
  name: string;
  remoteName: string;
  url: string;
}

function getAssetName(asset: string): string {
  // remove the extension from the asset name
  return asset.split('.')[0];
}

function getAssetUrl(asset: string) {
  // create placeholder reference url for the asset
  return 'prefetch:///' + asset;
}

async function prefetchAsset(asset: PrefetchAsset) {
  const client = (await import(
    '../ScriptManager/index.js'
  )) as typeof RepackClient;
  const { ScriptManager, getWebpackContext } = client;

  // caller should be undefined when fetching/loading the remote entry container
  const caller = asset.name === asset.remoteName ? undefined : asset.remoteName;

  return ScriptManager.shared.prefetchScript(
    asset.name,
    caller,
    getWebpackContext(),
    asset.url
  );
}

const RepackPrefetchPlugin: () => FederationRuntimePlugin = () => ({
  name: 'repack-prefetch-plugin',
  generatePreloadAssets: async (args) => {
    const preloadConfig = args.preloadOptions.preloadConfig;
    const remoteName = preloadConfig.nameOrAlias;
    const remoteSnapshot = args.remoteSnapshot;

    if (preloadConfig.depsRemote !== false) {
      console.warn(
        '[RepackPrefetchPlugin] ' +
          'The depsRemote configuration option is not implemented yet. ' +
          'This setting will be ignored and will have no effect. ' +
          'You can hide this warning by setting depsRemote explicitly to false.'
      );
    }

    function handleAssets(assets: string[]): PrefetchAsset[] {
      return assets.map((asset) => ({
        name: getAssetName(asset),
        remoteName,
        url: getAssetUrl(asset),
      }));
    }

    let assets: PrefetchAsset[] = [];

    if ('modules' in remoteSnapshot) {
      for (const exposedModule of remoteSnapshot.modules) {
        if (preloadConfig.exposes) {
          if (!preloadConfig.exposes.includes(exposedModule.moduleName)) {
            continue;
          }
        }

        if (preloadConfig.resourceCategory === 'all') {
          assets.push(...handleAssets(exposedModule.assets.js.async));
          assets.push(...handleAssets(exposedModule.assets.js.sync));
        } else if (preloadConfig.resourceCategory === 'sync') {
          assets.push(...handleAssets(exposedModule.assets.js.sync));
        }
      }

      if (preloadConfig.filter) {
        assets = assets.filter((asset) => preloadConfig.filter!(asset.name));
      }

      assets.unshift({
        name: remoteSnapshot.globalName,
        remoteName: remoteSnapshot.globalName,
        url: getAssetUrl(remoteSnapshot.remoteEntry),
      });
    }

    await Promise.all(assets.map(prefetchAsset));

    // noop for compatibility
    return Promise.resolve({
      cssAssets: [],
      jsAssetsWithoutEntry: [],
      entryAssets: [],
    });
  },
});

export default RepackPrefetchPlugin;
