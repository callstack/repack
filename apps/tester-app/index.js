import { Script, ScriptManager } from '@callstack/repack/client';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';

if (!__DEV__) {
  ScriptManager.shared.setStorage(AsyncStorage);
}

ScriptManager.shared.addResolver((scriptId, _caller) => {
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

// ScriptManager.shared.on('resolving', (...args) => {
//   console.log('DEBUG/resolving', ...args);
// });

// ScriptManager.shared.on('resolved', (...args) => {
//   console.log('DEBUG/resolved', ...args);
// });

// ScriptManager.shared.on('prefetching', (...args) => {
//   console.log('DEBUG/prefetching', ...args);
// });

// ScriptManager.shared.on('loading', (...args) => {
//   console.log('DEBUG/loading', ...args);
// });

// ScriptManager.shared.on('loaded', (...args) => {
//   console.log('DEBUG/loaded', ...args);
// });

// ScriptManager.shared.on('error', (...args) => {
//   console.log('DEBUG/error', ...args);
// });

ScriptManager.shared.hooks.beforeResolve((args) => {
  console.log('ScriptManager.shared.hooks.beforeResolve', args);
  return args;
});

ScriptManager.shared.hooks.resolve(async (args) => {
  for (const [, , resolve] of args.resolvers) {
    const resolvedLocator = await resolve(
      args.scriptId,
      args.caller,
      args.referenceUrl
    );
    if (resolvedLocator) {
      args.result = resolvedLocator;
    }
  }
});

ScriptManager.shared.hooks.afterResolve((args) => {
  console.log('ScriptManager.shared.hooks.afterResolve', args);
  return args;
});

ScriptManager.shared.hooks.beforeLoad((args) => {
  console.log('ScriptManager.shared.hooks.beforeLoad', args);
  return args;
});

ScriptManager.shared.hooks.load(async (args) => {
  console.log('ScriptManager.shared.hooks.load', args);
  await args.loadScript();
});

ScriptManager.shared.hooks.afterLoad((args) => {
  console.log('ScriptManager.shared.hooks.afterLoad', args);
  return args;
});

AppRegistry.registerComponent(appName, () => App);
