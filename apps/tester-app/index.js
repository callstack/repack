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

ScriptManager.shared.hooks.beforeResolve(
  ({ scriptId, caller, error }, callback) => {
    if (!error) {
      console.log('Before resolving:', scriptId, caller);
    }
    console.log(
      'ScriptManager.shared.hooks.beforeResolve',
      scriptId,
      caller,
      error
    );
    callback();
  }
);

ScriptManager.shared.hooks.resolve(async (params, callback) => {
  try {
    for (const [, , resolve] of params.resolvers) {
      const resolvedLocator = await resolve(
        params.scriptId,
        params.caller,
        params.referenceUrl
      );
      if (resolvedLocator) {
        params.result = resolvedLocator;
      }
    }
    callback(null);
  } catch (error) {
    console.error('Error resolving:', error);
    callback(error);
  }
});

ScriptManager.shared.hooks.afterResolve(
  ({ scriptId, caller, error }, callback) => {
    if (!error) {
      console.log('After resolving:', scriptId, caller);
    }
    console.log(
      'ScriptManager.shared.hooks.afterResolve',
      scriptId,
      caller,
      error
    );
    callback();
  }
);

ScriptManager.shared.hooks.errorResolve(
  ({ scriptId, caller, error }, callback) => {
    if (error) {
      console.error('Error resolving:', scriptId, caller, error);
    }
    console.log(
      'ScriptManager.shared.hooks.errorResolve',
      scriptId,
      caller,
      error
    );
    callback();
  }
);

ScriptManager.shared.hooks.beforeLoad(
  ({ scriptId, caller, error }, callback) => {
    console.log(
      'ScriptManager.shared.hooks.beforeLoad',
      scriptId,
      caller,
      error
    );
    callback();
  }
);

ScriptManager.shared.hooks.load(async (params, callback) => {
  try {
    console.log(
      'ScriptManager.shared.hooks.load',
      params.scriptId,
      params.caller
    );
    await params.loadScript();
    callback(null);
  } catch (error) {
    callback(error);
  }
});

ScriptManager.shared.hooks.afterLoad(
  ({ scriptId, caller, error }, callback) => {
    console.log(
      'ScriptManager.shared.hooks.afterLoad',
      scriptId,
      caller,
      error
    );
    callback();
  }
);

AppRegistry.registerComponent(appName, () => App);
