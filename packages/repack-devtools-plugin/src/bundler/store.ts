import { DEV_SERVER_STORE_GLOBAL, LIMITS } from '../shared/constants.js';
import { isRecord, readGlobal } from '../shared/guards.js';
import type {
  DevServerRequest,
  PlatformCompilation,
  ServerFault,
} from '../shared/types.js';

export type DevServerStore = {
  startedAt: number;
  port?: number;
  seq: number;
  compilations: Map<string, PlatformCompilation>;
  requests: DevServerRequest[];
  faults: ServerFault[];
};

const isDevServerStore = (value: unknown): value is DevServerStore =>
  isRecord(value) &&
  value.compilations instanceof Map &&
  Array.isArray(value.requests) &&
  Array.isArray(value.faults);

/**
 * One store per dev server process. Re.Pack runs every platform compiler in
 * the same process, so they all record here.
 */
export const getDevServerStore = (): DevServerStore => {
  const existing = readGlobal(DEV_SERVER_STORE_GLOBAL);
  if (isDevServerStore(existing)) return existing;
  const store: DevServerStore = {
    startedAt: Date.now(),
    seq: 0,
    compilations: new Map(),
    requests: [],
    faults: [],
  };
  Reflect.set(globalThis, DEV_SERVER_STORE_GLOBAL, store);
  return store;
};

export const getCompilation = (store: DevServerStore, platform: string) => {
  let compilation = store.compilations.get(platform);
  if (!compilation) {
    compilation = {
      platform,
      status: 'idle',
      builds: 0,
      errors: [],
      warnings: [],
      errorCount: 0,
      warningCount: 0,
      assets: [],
      changedFiles: [],
      removedFiles: [],
    };
    store.compilations.set(platform, compilation);
  }
  return compilation;
};

export const pushRequest = (
  store: DevServerStore,
  request: Omit<DevServerRequest, 'seq'>
) => {
  store.seq += 1;
  store.requests.push({ ...request, seq: store.seq });
  if (store.requests.length > LIMITS.devServerRequests) {
    store.requests.splice(0, store.requests.length - LIMITS.devServerRequests);
  }
};
