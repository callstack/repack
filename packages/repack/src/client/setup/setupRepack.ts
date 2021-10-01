/* eslint-env browser */
/* globals __repack__ __DEV__ */

import { ChunkManager } from '../api';
import { LoadEvent } from '../shared/LoadEvent';
import { getDevServerLocation } from './utils/getDevServerLocation';

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

__repack__.loadChunk = async (
  url: string,
  cb: (event?: LoadEvent) => void,
  chunkName?: string,
  chunkId?: string | number,
  parentChunkId?: string | number
) => {
  if (chunkName !== undefined && chunkId !== undefined) {
    // Load webpack chunk
    try {
      await ChunkManager.loadChunk(
        chunkId.toString(),
        parentChunkId?.toString()
      );
    } catch (error) {
      cb(error as LoadEvent);
    }
  } else {
    // Load HMR update
    if (__DEV__ && module.hot) {
      const update = await fetch(url);
      if (!update.ok) {
        cb(new LoadEvent(update.statusText, url));
      } else {
        const script = await update.text();
        try {
          // @ts-ignore
          const globalEvalWithSourceUrl = global.globalEvalWithSourceUrl;
          (function () {
            if (globalEvalWithSourceUrl) {
              globalEvalWithSourceUrl(script, null);
            } else {
              eval(script);
            }
          }.call(global));
          cb();
        } catch (error) {
          console.error('Loading HMR update chunk failed:', error);
          cb(new LoadEvent('exec', url, error));
        }
      }
    } else {
      throw new Error('Loading HMR update chunks is disabled');
    }
  }
};
