import { AppRegistry, Platform } from 'react-native';
import { ScriptManager, Federated } from '@callstack/repack/client';

import App from './src/host/App';
import { components } from './app.json';

const resolveURL = Federated.createURLResolver({
  containers: { MiniApp: 'http://localhost:8082/[name][ext]' },
});

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  return {
    url: resolveURL(scriptId, caller),
    query: { platform: Platform.OS },
  };
});

AppRegistry.registerComponent(components[0].appKey, () => App);
