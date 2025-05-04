import { Script, ScriptManager } from '@callstack/repack/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (!__DEV__) {
  ScriptManager.shared.setStorage(AsyncStorage);
}

ScriptManager.shared.addResolver(async (scriptId, _caller) => {
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

  return {
    url: Script.getRemoteURL(`http://localhost:9999/${scriptId}`),
  };
});

// ScriptManager Event Listeners
// Run `react-native start --verbose` to see these logs
ScriptManager.shared.on('resolving', (...args) => {
  console.debug('ScriptManagerEvent:resolving', ...args);
});

ScriptManager.shared.on('resolved', (...args) => {
  console.debug('ScriptManagerEvent:resolved', ...args);
});

ScriptManager.shared.on('prefetching', (...args) => {
  console.debug('ScriptManagerEvent:prefetching', ...args);
});

ScriptManager.shared.on('loading', (...args) => {
  console.debug('ScriptManagerEvent:loading', ...args);
});

ScriptManager.shared.on('loaded', (...args) => {
  console.debug('ScriptManagerEvent:loaded', ...args);
});

ScriptManager.shared.on('error', (...args) => {
  console.debug('ScriptManagerEvent:error', ...args);
});

// ScriptManager Hooks
// Run `react-native start --verbose` to see these logs
ScriptManager.shared.hooks.beforeResolve(async (args) => {
  console.debug('ScriptManager.shared.hooks.beforeResolve', args);
  return args;
});

ScriptManager.shared.hooks.resolve(async (args) => {
  console.debug('ScriptManager.shared.hooks.resolve', args);
  const { scriptId, caller, referenceUrl } = args.options;
  for (const [, , resolve] of args.resolvers) {
    const locator = await resolve(scriptId, caller, referenceUrl);
    if (locator) return locator;
  }
});

ScriptManager.shared.hooks.afterResolve(async (args) => {
  console.debug('ScriptManager.shared.hooks.afterResolve', args);
  return args;
});

ScriptManager.shared.hooks.beforeLoad(async (args) => {
  console.debug('ScriptManager.shared.hooks.beforeLoad', args);
  return args;
});

ScriptManager.shared.hooks.load(async (args) => {
  console.debug('ScriptManager.shared.hooks.load', args);
  await args.loadScript();
  return true;
});

ScriptManager.shared.hooks.afterLoad(async (args) => {
  console.debug('ScriptManager.shared.hooks.afterLoad', args);
  return args;
});
