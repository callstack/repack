import { AppRegistry, Platform } from 'react-native';
import { ScriptManager, Script } from '@callstack/repack/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './src/App';
import { name as appName } from './app.json';


ScriptManager.configure({
  storage: AsyncStorage,
  resolve: async (scriptId, caller) => {
    if (__DEV__) {
      return {
        url: Script.getDevServerURL(scriptId),
        cache: false,
      };
    }

    return {
      url: Script.getRemoteURL(`http://localhost:5000/${scriptId}`)
    };
  }
});

ScriptManager.on('resolving', (...args) => {
  console.log('DEBUG/resolving', ...args);
});

ScriptManager.on('resolved', (...args) => {
  console.log('DEBUG/resolved', ...args);
});

ScriptManager.on('preloading', (...args) => {
  console.log('DEBUG/preloading', ...args);
});

ScriptManager.on('loading', (...args) => {
  console.log('DEBUG/loading', ...args);
});

ScriptManager.on('loaded', (...args) => {
  console.log('DEBUG/loaded', ...args);
});

ScriptManager.on('error', (...args) => {
  console.log('DEBUG/error', ...args);
});

AppRegistry.registerComponent(appName, () => App);
