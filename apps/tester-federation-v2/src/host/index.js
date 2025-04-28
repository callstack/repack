import { ScriptManager } from '@callstack/repack/client';
import { preloadRemote } from '@module-federation/runtime';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppRegistry } from 'react-native';

import { components } from '../../app.json';
import App from './App';

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
