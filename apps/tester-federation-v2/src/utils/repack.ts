import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';

// Should add resolvers
const runtimeDebug: () => FederationRuntimePlugin = () => ({
  name: 'repack-runtime-plugin',
  async afterResolve(args) {
    const remoteInfo = args.remoteInfo;
    const remoteSnapshot = args.remoteSnapshot;
    const { ScriptManager } = require('@callstack/repack/client');

    if (remoteSnapshot) {
      // remote entry is a manifest,
      ScriptManager.shared.addResolver((scriptId: string, caller?: string) => {
        if (scriptId === remoteInfo.entryGlobalName) {
          return { url: remoteInfo.entry };
        }
        if (caller === remoteInfo.entryGlobalName) {
          if ('publicPath' in remoteSnapshot) {
            console.log('publicPath?');
            const url = remoteSnapshot.publicPath + scriptId + '.chunk.bundle';
            return { url };
          } else if ('getPublicPath' in remoteSnapshot) {
            // TODO
            console.log('getPublicPath');
            throw new Error('getPublicPath - not implemented');
          } else {
            // TODO
            console.log('pure?');
            throw new Error('pure - not implemented');
          }
        }
      });
    } else {
      // remote entry is a container
      ScriptManager.shared.addResolver((scriptId: string, caller?: string) => {
        const { Platform } = require('react-native');
        if (scriptId === remoteInfo.entryGlobalName) {
          return { url: remoteInfo.entry, query: { platform: Platform.OS } };
        }
        // if (caller === remoteInfo.entryGlobalName) {
        //   return { url: }
        // }
      });
    }

    return args;
  },
});

export default runtimeDebug;
