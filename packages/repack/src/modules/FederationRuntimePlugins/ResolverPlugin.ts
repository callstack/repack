import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';
import type * as RepackClient from '../ScriptManager/index.js';

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

const getPublicPath = (url: string) => {
  const [protocol, rest] = url.split('://');
  return protocol + '://' + rest.split('/')[0];
};

const getAssetPath = (url: string) => {
  const assetPath = url.split(getPublicPath(url))[1];
  // normalize by removing leading slash
  return assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
};

const rebaseRemoteUrl = (from: string, to: string) => {
  const assetPath = getAssetPath(from);
  const publicPath = getPublicPath(to);
  return [publicPath, assetPath].join('/');
};

const RepackResolverPlugin: (
  config?: RepackResolverPluginConfiguration
) => FederationRuntimePlugin = (config) => ({
  name: 'repack-resolver-plugin',
  afterResolve(args) {
    const { remoteInfo } = args;
    const { ScriptManager } =
      require('../ScriptManager/index.js') as typeof RepackClient;

    // when manifest is used, the valid entry URL comes from the version field
    // otherwise, the entry URL comes from the entry field which has the correct publicPath for the remote set
    const entryUrl = remoteInfo.version ?? remoteInfo.entry;

    ScriptManager.shared.addResolver(
      async (scriptId, caller, referenceUrl) => {
        if (scriptId === remoteInfo.name || caller === remoteInfo.name) {
          // referenceUrl should always be present and this should never happen
          if (!referenceUrl) {
            throw new Error('[RepackResolverPlugin] Reference URL is missing');
          }

          const url = rebaseRemoteUrl(referenceUrl, entryUrl);
          const locator = await createScriptLocator(url, config);
          return locator;
        }
      },
      { key: remoteInfo.name }
    );

    return args;
  },
});

export default RepackResolverPlugin;
