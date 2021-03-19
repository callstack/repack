/* eslint-env browser */
/* globals __webpack_require__ __DEV__ */

// @ts-ignore
import { NativeModules } from 'react-native';

class LoadEvent {
  target: { src: string };

  constructor(public type: string, src: string) {
    this.target = { src };
  }
}

type LoadCallback = (event?: LoadEvent) => void;

async function loadHmrUpdate(url: string, cb: LoadCallback) {
  const response = await fetch(url);
  if (!response.ok) {
    cb(new LoadEvent(response.statusText, url));
  } else {
    const script = await response.text();
    try {
      // @ts-ignore
      const globalEvalWithSourceUrl = global.globalEvalWithSourceUrl;
      if (globalEvalWithSourceUrl) {
        globalEvalWithSourceUrl(script, null);
      } else {
        eval(script);
      }
      cb();
    } catch (error) {
      console.error('[loadHmrUpdate] Error:', error);
      cb(new LoadEvent('exec', url));
    }
  }
}

async function loadAsyncChunk(
  url: string,
  cb: LoadCallback,
  chunkId: string | number
) {
  try {
    await NativeModules.WebpackToolkit.loadChunk(chunkId.toString(), url);
  } catch (error) {
    console.error('[loadAsyncChunk] Error:', error);
    cb(new LoadEvent('load', url));
  }
}

// In development with enabled HMR, simply eval the script.

__webpack_require__.l = async (
  url: string,
  cb: (event?: LoadEvent) => void,
  chunkName?: string,
  chunkId?: string | number
) => {
  if (chunkName !== undefined && chunkId !== undefined) {
    await loadAsyncChunk(url, cb, chunkId);
  } else {
    if (__DEV__ && module.hot) {
      await loadHmrUpdate(url, cb);
    } else {
      throw new Error('[__webpack_require__.l] Loading HMR update is disabled');
    }
  }
};
