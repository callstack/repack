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
        if (scriptId === remoteInfo.entryGlobalName) {
          return { url: remoteInfo.entry };
        }
        if (referenceUrl && caller === remoteInfo.entryGlobalName) {
          return { url: referenceUrl };
        }
      },
      { key: remoteInfo.entryGlobalName }
    );

    return args;
  },
});

export default repackFederationRuntimePlugin;
