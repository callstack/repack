import type {
  FederationHost,
  FederationRuntimePlugin,
} from '@module-federation/enhanced/runtime';
import type * as RepackClient from '../ScriptManager/index.js';

type MFRemote = Parameters<FederationHost['registerRemotes']>[0][0];

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
  return url.split('/').slice(0, -1).join('/');
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

const registerResolver = async (
  remoteInfo: MFRemote,
  config?: RepackResolverPluginConfiguration
) => {
  // when ScriptManager.shared.resolveScript is called, registerResolver
  // should evaluate before it and and the resolver will be registered
  // before any remote script is resolved
  const { ScriptManager } = (await import(
    '../ScriptManager/index.js'
  )) as typeof RepackClient;

  // when manifest is used, the valid entry URL comes from the version field
  // otherwise, the entry URL comes from the entry field which has the correct publicPath for the remote set
  let entryUrl: string | undefined;
  if ('version' in remoteInfo && remoteInfo.version) {
    entryUrl = remoteInfo.version;
  } else if ('entry' in remoteInfo) {
    entryUrl = remoteInfo.entry;
  }

  if (!entryUrl) {
    throw new Error(
      '[RepackResolverPlugin] Cannot determine entry URL for remote: ' +
        remoteInfo.name
    );
  }

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
};

const RepackResolverPlugin: (
  config?: RepackResolverPluginConfiguration
) => FederationRuntimePlugin = (config) => ({
  name: 'repack-resolver-plugin',
  registerRemote: (args) => {
    // asynchronously add a resolver for the remote
    registerResolver(args.remote, config);
    return args;
  },
});

export default RepackResolverPlugin;
