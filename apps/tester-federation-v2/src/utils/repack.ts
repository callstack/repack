import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';
import type * as RepackClient from '@callstack/repack/client';

type SM = typeof RepackClient.ScriptManager;

const repackRuntime: () => FederationRuntimePlugin = () => ({
  name: 'repack-runtime-plugin',
  async afterResolve(args) {
    const { remoteInfo } = args;
    const Platform = require('react-native').Platform;
    const ScriptManager: SM = require('@callstack/repack/client').ScriptManager;
    const platformQuery = __DEV__ ? { platform: Platform.OS } : undefined;

    ScriptManager.shared.addResolver(
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

export default repackRuntime;
