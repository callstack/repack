import { createElement, useEffect, useState } from 'react';
import { ScriptManager, Script } from '@callstack/repack/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const bootstrap = () => {
  ScriptManager.shared.setStorage(AsyncStorage);
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

  ScriptManager.shared.on('resolving', (...args) => {
    console.log('DEBUG/resolving', ...args);
  });

  ScriptManager.shared.on('resolved', (...args) => {
    console.log('DEBUG/resolved', ...args);
  });

  ScriptManager.shared.on('prefetching', (...args) => {
    console.log('DEBUG/prefetching', ...args);
  });

  ScriptManager.shared.on('loading', (...args) => {
    console.log('DEBUG/loading', ...args);
  });

  ScriptManager.shared.on('loaded', (...args) => {
    console.log('DEBUG/loaded', ...args);
  });

  ScriptManager.shared.on('error', (...args) => {
    console.log('DEBUG/error', ...args);
  });
};

/* HOC for setting up ScriptManager properly inside of react-native-test-app */
export const withBootstrap = (Component: React.FC) => () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    bootstrap();
    setIsReady(true);
  }, []);

  return isReady ? createElement(Component) : null;
};
