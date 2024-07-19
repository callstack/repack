import { AppRegistry, Platform } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

import { ScriptManager, Federated } from '@callstack/repack/client';

let containers;

if (__DEV__) {
  containers = {
    MiniApp: 'http://localhost:9000/[name][ext]',
  };
}

const resolveURL = Federated.createURLResolver({ containers });

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  const url = resolveURL(scriptId, caller);

  if (url) {
    return {
      url,
      query: {
        platform: Platform.OS,
      },
    };
  }
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
