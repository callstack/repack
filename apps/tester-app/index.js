import { Script, ScriptManager } from '@callstack/repack/client';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';

if (!__DEV__) {
  ScriptManager.shared.setStorage(AsyncStorage);
}

ScriptManager.hooks.beforeResolve.tap(
  'test-before',
  async ({ scriptId, caller, error }) => {
    if (!error) {
      console.log('Before resolving:', scriptId, caller);
    }
  }
);

ScriptManager.hooks.resolve.tap(
  'test-during',
  async ({ scriptId, caller, error }) => {
    if (!error) {
      console.log('During resolving:', scriptId, caller);
    }
  }
);

ScriptManager.hooks.afterResolve.tapAsync(
  'test-after',
  async ({ scriptId, caller, error }) => {
    if (!error) {
      console.log('After resolving:', scriptId, caller);
    }
  }
);

ScriptManager.hooks.errorResolve.tapAsync(
  'test-error',
  async ({ scriptId, caller, error }) => {
    if (error) {
      console.error('Error resolving:', scriptId, caller, error);
    }
  }
);

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

AppRegistry.registerComponent(appName, () => App);
