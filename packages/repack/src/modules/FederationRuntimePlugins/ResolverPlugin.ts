import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';
import type * as RepackClient from '../ScriptManager';

const repackResolverPlugin: () => FederationRuntimePlugin = () => ({
  name: 'repack-resolver-plugin',
  afterResolve(args) {
    const { ScriptManager } = require('./ScriptManager') as typeof RepackClient;
    const { remoteInfo } = args;

    ScriptManager.shared.addResolver(
      async (scriptId, caller, referenceUrl) => {
        if (scriptId === remoteInfo.entryGlobalName) {
          return { url: remoteInfo.entry };
        }

        if (referenceUrl && caller === remoteInfo.entryGlobalName) {
          const publicPath = remoteInfo.entry.split('/').slice(0, -1).join('/');
          const bundlePath = scriptId + referenceUrl.split(scriptId)[1];
          return { url: publicPath + '/' + bundlePath };
        }
      },
      { key: remoteInfo.entryGlobalName }
    );

    return args;
  },
});

export default repackResolverPlugin;
