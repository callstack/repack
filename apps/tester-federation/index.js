import { Federated, ScriptManager } from '@callstack/repack/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppRegistry, Platform } from 'react-native';

import { components } from './app.json';
import App from './src/host/App';

ScriptManager.shared.setStorage(AsyncStorage);

const resolveURL = Federated.createURLResolver({
  containers: { MiniApp: 'http://localhost:8082/[name][ext]' },
});

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  return {
    url: resolveURL(scriptId, caller),
    query: { platform: Platform.OS },
    cache: process.env.MF_CACHE,
  };
});

AppRegistry.registerComponent(components[0].appKey, () => App);
