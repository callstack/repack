import { Script, ScriptManager } from '@callstack/repack/client';

ScriptManager.shared.addResolver(async (scriptId) => {
  if (__DEV__) {
    return {
      url: Script.getDevServerURL(scriptId),
      cache: false,
    };
  }

  // all chunks are configured as `local` - read them from the app bundle
  return {
    url: Script.getFileSystemURL(scriptId),
    cache: false,
  };
});
