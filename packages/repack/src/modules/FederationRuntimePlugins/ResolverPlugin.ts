import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';
import type * as RepackClient from '../ScriptManager';

export type RepackResolverPluginConfiguration =
  | Omit<RepackClient.ScriptLocator, 'url'>
  | ((url: string) => Promise<RepackClient.ScriptLocator>);

const createScriptLocator = async (
  entryUrl: string,
  config?: RepackResolverPluginConfiguration
) => {
  if (typeof config === 'function') {
    const locator = await config(entryUrl);
    return locator;
  }
  if (typeof config === 'object') {
    return { url: entryUrl, ...config };
  }
  return { url: entryUrl };
};

export const repackResolverPlugin: (
  config?: RepackResolverPluginConfiguration
) => FederationRuntimePlugin = (config) => ({
  name: 'repack-resolver-plugin',
  afterResolve(args) {
    const { ScriptManager } = require('./ScriptManager') as typeof RepackClient;
    const { remoteInfo } = args;

    ScriptManager.shared.addResolver(
      async (scriptId, caller, referenceUrl) => {
        // entry container
        if (scriptId === remoteInfo.entryGlobalName) {
          const locator = await createScriptLocator(remoteInfo.entry, config);
          return locator;
        }
        // entry chunks
        if (referenceUrl && caller === remoteInfo.entryGlobalName) {
          const publicPath = remoteInfo.entry.split('/').slice(0, -1).join('/');
          const bundlePath = scriptId + referenceUrl.split(scriptId)[1];
          const url = publicPath + '/' + bundlePath;

          const locator = await createScriptLocator(url, config);
          return locator;
        }
      },
      { key: remoteInfo.entryGlobalName }
    );

    return args;
  },
});
