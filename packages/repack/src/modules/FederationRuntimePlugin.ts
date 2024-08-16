import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';
import type { ScriptManager } from './ScriptManager';

type SM = typeof ScriptManager;

const repackFederationRuntimePlugin: () => FederationRuntimePlugin = () => ({
  name: 'repack-federation-runtime-plugin',
  afterResolve(args) {
    const { remoteInfo } = args;
    const ScriptManager: SM = require('./ScriptManager').ScriptManager;

    ScriptManager.shared.addResolver(
      // eslint-disable-next-line require-await
      async (scriptId, caller, referenceUrl) => {
        console.log('afterResolve: ', scriptId, caller, referenceUrl);
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

export default repackFederationRuntimePlugin;
