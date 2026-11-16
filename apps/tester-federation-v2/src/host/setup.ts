import { Script, ScriptManager } from '@callstack/repack/client';

import { registerEventCounter } from './features/runtime/events';

const HOST_OWNED_CHUNKS = ['remote', 'miniapp', 'host-async-local'];

ScriptManager.shared.addResolver(async (scriptId) => {
  if (!HOST_OWNED_CHUNKS.includes(scriptId)) {
    return undefined;
  }

  if (__DEV__) {
    return {
      url: Script.getDevServerURL(scriptId),
      cache: false,
    };
  }

  if (scriptId.includes('local')) {
    return {
      url: Script.getFileSystemURL(scriptId),
      cache: false,
    };
  }

  // release builds are out of scope for the e2e lane; nothing serves :9999 yet
  return {
    url: Script.getRemoteURL(`http://localhost:9999/${scriptId}`),
  };
});

registerEventCounter();
