import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';
import type * as RepackClient from '../ScriptManager/index.js';

const RepackCorePlugin: () => FederationRuntimePlugin = () => ({
  name: 'repack-core-plugin',
  loadEntry: async ({ remoteInfo }) => {
    const client = require('../ScriptManager/index.js') as typeof RepackClient;
    const { ScriptManager, getWebpackContext } = client;
    const { entry, entryGlobalName } = remoteInfo;

    try {
      await ScriptManager.shared.loadScript(
        entryGlobalName,
        undefined,
        getWebpackContext(),
        entry
      );

      // @ts-expect-error
      if (!globalThis[entryGlobalName]) {
        throw new Error();
      }

      // @ts-expect-error
      return globalThis[entryGlobalName];
    } catch {
      console.error(`Failed to load remote entry: ${entryGlobalName}`);
    }
  },
  generatePreloadAssets: async () => {
    // noop for compatibility
    return Promise.resolve({
      cssAssets: [],
      jsAssetsWithoutEntry: [],
      entryAssets: [],
    });
  },
});

export default RepackCorePlugin;
