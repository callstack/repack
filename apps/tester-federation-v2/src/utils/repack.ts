import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';
import type * as RePackClient from '@callstack/repack/client';

type SM = typeof RePackClient.ScriptManager;

const repackRuntime: () => FederationRuntimePlugin = () => ({
  name: 'repack-runtime-plugin',
  async afterResolve(args) {
    const remoteInfo = args.remoteInfo;
    const remoteSnapshot = args.remoteSnapshot;
    const ScriptManager: SM = require('@callstack/repack/client').ScriptManager;

    if (remoteSnapshot) {
      // remote entry is a manifest,
      ScriptManager.shared.addResolver(
        async (scriptId, caller, referenceUrl) => {
          if (scriptId === remoteInfo.entryGlobalName) {
            return { url: remoteInfo.entry };
          }
          if (caller === remoteInfo.entryGlobalName) {
            return { url: referenceUrl as string };
          }
        }
      );
    } else {
      // remote entry is a container
      ScriptManager.shared.addResolver(
        async (scriptId, caller, referenceUrl) => {
          const { Platform } = require('react-native');
          if (scriptId === remoteInfo.entryGlobalName) {
            return {
              url: remoteInfo.entry,
              query: { platform: Platform.OS },
            };
          }
          if (caller === remoteInfo.entryGlobalName) {
            return {
              url: referenceUrl as string,
              query: { platform: Platform.OS },
            };
          }
        }
      );
    }

    return args;
  },
});

export default repackRuntime;
