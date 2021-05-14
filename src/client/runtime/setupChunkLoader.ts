/* eslint-env browser */
/* globals __webpack_require__ __DEV__ */

import { ChunkManager } from '../chunks-api';
import { getDevServerLocation } from './getDevServerLocation';

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
      console.error('Loading HMR update chunk failed:', error);
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
    await ChunkManager.loadChunk(chunkId.toString());
  } catch (error) {
    cb(new LoadEvent('load', url));
  }
}

// We need to teak Webpack's public path, especially for Android, where `localhost`
// is not a correct host but eg `10.0.2.2` is.
// If the public path doesn't have `localhost` in it, it usually means a custom `host` was
// provided, so the replace won't change that.
const { hostname } = getDevServerLocation();
// eslint-disable-next-line
__webpack_public_path__ = __webpack_public_path__.replace(
  'localhost',
  hostname
);

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
      throw new Error('Loading HMR update chunks is disabled');
    }
  }
};
