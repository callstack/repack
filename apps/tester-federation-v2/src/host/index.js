import { ScriptManager } from '@callstack/repack/client';
import { preloadRemote } from '@module-federation/runtime';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppRegistry, LogBox } from 'react-native';

import '../../global.css';
import { components } from '../../app.json';
import './setup';
import App from './App';

// the toast covers Home's last row and steals taps from the e2e suite
LogBox.ignoreLogs(['ImageBackground is deprecated']);

if (__WITH_PRELOAD__) {
  // enable caching of scripts in the AsyncStorage
  ScriptManager.shared.setStorage(AsyncStorage);

  // preload eagerly on startup
  // you can kill the dev server before going to the mini app screen
  // and it will still work because of the assets being present in cache
  ScriptManager.shared
    // invalidate cache to make sure we fetch the latest assets
    .invalidateScripts()
    // preload the MiniApp remote entry and all its assets
    .then(() => {
      return preloadRemote([
        { nameOrAlias: 'MiniApp', resourceCategory: 'sync', depsRemote: false },
      ]);
    })
    .then(() => {
      console.log('preloaded MiniApp assets');
    })
    .catch((e) => {
      // preloadRemote will fail if the remote entry is not a manifest
      console.error('error preloading MiniApp assets');
      console.error(e);
    });

  ScriptManager.shared.on('prefetching', (script) => {
    console.debug('prefetching', script.locator.uniqueId);
  });
}

AppRegistry.registerComponent(components[0].appKey, () => App);
