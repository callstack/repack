import { LIMITS, STORE_GLOBAL } from '../shared/constants';
import { isRecord, readGlobal, readString } from '../shared/guards';
import type {
  FederationEvent,
  RecordedError,
  ScriptCall,
  ScriptEvent,
  ScriptFault,
  ScriptRecord,
} from '../shared/types';

export type DevToolsStore = {
  installedAt: number;
  /** Set when recording started from the app entry, before the first render. */
  bootRecording: boolean;
  seq: number;
  scripts: Map<string, ScriptRecord>;
  scriptEvents: ScriptEvent[];
  scriptCalls: ScriptCall[];
  /** Active ScriptManager faults (see `faults.ts`). */
  faults: ScriptFault[];
  federationEvents: FederationEvent[];
  errors: RecordedError[];
  listeners: Set<() => void>;
  hooked: {
    scriptManager: boolean;
    errorHandler: boolean;
    runtimePlugin: boolean;
    callTracer: boolean;
    faultHooks: boolean;
    federationInstances: Set<unknown>;
  };
};

export type ClearScope = 'all' | 'scripts' | 'federation' | 'errors';

const createStore = (): DevToolsStore => ({
  installedAt: Date.now(),
  bootRecording: false,
  seq: 0,
  scripts: new Map(),
  scriptEvents: [],
  scriptCalls: [],
  faults: [],
  federationEvents: [],
  errors: [],
  listeners: new Set(),
  hooked: {
    scriptManager: false,
    errorHandler: false,
    runtimePlugin: false,
    callTracer: false,
    faultHooks: false,
    federationInstances: new Set(),
  },
});

/**
 * The store lives on `globalThis` so every copy of this package in the JS
 * realm (host app, federated remotes, the MF runtime plugin entry) records
 * into the same buffers.
 */
const isDevToolsStore = (value: unknown): value is DevToolsStore =>
  isRecord(value) &&
  value.scripts instanceof Map &&
  value.listeners instanceof Set &&
  Array.isArray(value.errors) &&
  // stores created by an older copy of the plugin lack newer fields
  Array.isArray(value.scriptCalls) &&
  Array.isArray(value.faults);

export const getStore = (): DevToolsStore => {
  const existing = readGlobal(STORE_GLOBAL);
  if (isDevToolsStore(existing)) return existing;
  const store = createStore();
  Reflect.set(globalThis, STORE_GLOBAL, store);
  return store;
};

let notifyScheduled = false;

export const notify = (store: DevToolsStore = getStore()) => {
  if (notifyScheduled) return;
  notifyScheduled = true;
  setTimeout(() => {
    notifyScheduled = false;
    for (const listener of store.listeners) {
      try {
        listener();
      } catch {
        // a broken listener must not stop recording
      }
    }
  }, 100);
};

export const subscribe = (listener: () => void) => {
  const store = getStore();
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
};

export const nextSeq = (store: DevToolsStore) => {
  store.seq += 1;
  return store.seq;
};

export const pushBounded = <T>(list: T[], item: T, limit: number) => {
  list.push(item);
  if (list.length > limit) {
    list.splice(0, list.length - limit);
  }
};

export const truncate = (
  value: string | undefined,
  limit: number = LIMITS.messageLength
) => {
  if (value === undefined || value.length <= limit) return value;
  return `${value.slice(0, limit)}… (${value.length - limit} more chars)`;
};

export const clearStore = (scope: ClearScope = 'all') => {
  const store = getStore();
  if (scope === 'all' || scope === 'scripts') {
    store.scripts.clear();
    store.scriptEvents.length = 0;
    store.scriptCalls.length = 0;
  }
  if (scope === 'all' || scope === 'federation') {
    store.federationEvents.length = 0;
  }
  if (scope === 'all' || scope === 'errors') {
    store.errors.length = 0;
  }
  notify(store);
};

export const recordError = (
  error: Omit<RecordedError, 'id' | 'at'> & { at?: number }
): RecordedError => {
  const store = getStore();
  const seq = nextSeq(store);
  const recorded: RecordedError = {
    ...error,
    id: `err-${seq}`,
    at: error.at ?? Date.now(),
    message: truncate(error.message) ?? '',
    stack: truncate(error.stack),
  };
  pushBounded(store.errors, recorded, LIMITS.errors);
  notify(store);
  return recorded;
};

export const describeError = (error: unknown) => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (isRecord(error) && 'message' in error) {
    return {
      name: readString(error, 'name'),
      message: String(error.message),
      stack: readString(error, 'stack'),
    };
  }
  return { name: undefined, message: String(error), stack: undefined };
};
