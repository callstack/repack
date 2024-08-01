import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';
import type { ScriptManager } from './ScriptManager';

type SM = typeof ScriptManager;

const repackFederationRuntimePlugin: () => FederationRuntimePlugin = () => ({
  name: 'repack-federation-runtime-plugin',
  afterResolve(args) {
    const { remoteInfo } = args;
    const Platform = require('react-native').Platform;
    const ScriptManager: SM = require('@callstack/repack/client').ScriptManager;
    const platformQuery = __DEV__ ? { platform: Platform.OS } : undefined;

    ScriptManager.shared.addResolver(
      // eslint-disable-next-line require-await
      async (scriptId, caller, referenceUrl) => {
        if (scriptId === remoteInfo.entryGlobalName) {
          return { url: remoteInfo.entry, query: platformQuery };
        }
        if (referenceUrl && caller === remoteInfo.entryGlobalName) {
          return { url: referenceUrl, query: platformQuery };
        }
      },
      { key: remoteInfo.entryGlobalName }
    );

    return args;
  },
});

export default repackFederationRuntimePlugin;
