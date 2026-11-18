import { BroadcastChannel, isMainThread } from 'node:worker_threads';
import { isRecord } from '../shared/guards.js';
import type { PlatformCompilation } from '../shared/types.js';
import type { DevServerStore } from './store.js';

/**
 * Re.Pack's webpack compiler builds each platform in a worker thread that
 * evaluates the config again, so the collector there writes to the worker's
 * store while the dev-server endpoints read the main thread's. Workers publish
 * each compilation snapshot on this channel and the main thread copies it into
 * its store. With Rspack every compiler runs in the main thread and this is a
 * no-op.
 */
const CHANNEL_NAME = 'callstack/repack-devtools:compilations';

const isPlatformCompilation = (value: unknown): value is PlatformCompilation =>
  isRecord(value) &&
  typeof value.platform === 'string' &&
  typeof value.status === 'string' &&
  typeof value.builds === 'number';

let publisher: BroadcastChannel | undefined;

export const publishCompilation = (
  compilation: PlatformCompilation,
  mainThread = isMainThread
) => {
  if (mainThread) return;
  if (!publisher) {
    publisher = new BroadcastChannel(CHANNEL_NAME);
    publisher.unref();
  }
  publisher.postMessage(compilation);
};

let subscriber: BroadcastChannel | undefined;

export const subscribeToWorkerCompilations = (
  store: DevServerStore,
  mainThread = isMainThread
) => {
  if (!mainThread || subscriber) return;
  subscriber = new BroadcastChannel(CHANNEL_NAME);
  subscriber.unref();
  subscriber.onmessage = (event: unknown) => {
    const data = isRecord(event) ? event.data : undefined;
    if (isPlatformCompilation(data)) {
      store.compilations.set(data.platform, data);
    }
  };
};

/** Test helper: closes both ends so the channel name can be reused. */
export const closeWorkerSync = () => {
  publisher?.close();
  subscriber?.close();
  publisher = undefined;
  subscriber = undefined;
};
