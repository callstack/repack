import { LIMITS } from '../shared/constants';
import {
  getProp,
  isRecord,
  readArray,
  readBoolean,
  readNumber,
  readString,
  toStringArray,
  toStringRecord,
} from '../shared/guards';
import type {
  ScriptError,
  ScriptEvent,
  ScriptEventType,
  ScriptLocatorSummary,
  ScriptRecord,
} from '../shared/types';
import {
  type DevToolsStore,
  describeError,
  getStore,
  nextSeq,
  notify,
  pushBounded,
  recordError,
  truncate,
} from './store';

/** Fields of `Script#toObject()` (or `{ scriptId, caller }`) used here. */
type ScriptObject = {
  scriptId: string;
  caller?: string;
  cache?: boolean;
  uniqueId?: string;
  locator?: ScriptLocatorSummary;
};

type ScriptManagerLike = {
  on(event: string, listener: (payload: unknown) => void): unknown;
};

/** Mirrors `Script.getScriptUniqueId` in `@callstack/repack/client`. */
export const getScriptUniqueId = (scriptId: string, caller?: string) =>
  (caller ? `${caller}_` : '') + scriptId;

const toLocator = (value: unknown): ScriptLocatorSummary | undefined =>
  isRecord(value)
    ? {
        url: readString(value, 'url'),
        query: readString(value, 'query'),
        method: readString(value, 'method'),
        headers: toStringRecord(value.headers),
        absolute: readBoolean(value, 'absolute'),
        timeout: readNumber(value, 'timeout'),
        retry: readNumber(value, 'retry'),
        retryDelay: readNumber(value, 'retryDelay'),
        fetch: readBoolean(value, 'fetch'),
        verifyScriptSignature: readString(value, 'verifyScriptSignature'),
      }
    : undefined;

export const toScriptObject = (value: unknown): ScriptObject | undefined => {
  const scriptId = readString(value, 'scriptId');
  if (scriptId === undefined) return undefined;
  const locator = getProp(value, 'locator');
  return {
    scriptId,
    caller: readString(value, 'caller'),
    cache: readBoolean(value, 'cache'),
    uniqueId: readString(locator, 'uniqueId'),
    locator: toLocator(locator),
  };
};

const STAGES: Array<[RegExp, ScriptError['stage']]> = [
  [/resolving script locator/i, 'resolve'],
  [/creating script/i, 'create'],
  [/prefetch/i, 'prefetch'],
  [/load script/i, 'load'],
  [/invalidate/i, 'invalidate'],
];

/** Parses ScriptManager's `error` event payload: `{ message, args, originalError }`. */
export const parseScriptManagerError = (
  payload: unknown
): { error: ScriptError; script?: ScriptObject } => {
  const message =
    readString(payload, 'message') ?? 'Unknown ScriptManager error';
  const stage = STAGES.find(([pattern]) => pattern.test(message))?.[1];
  const args = readArray(payload, 'args');
  const script = args
    .map(toScriptObject)
    .find((item): item is ScriptObject => item !== undefined);
  const codeArg = args.find(
    (arg): arg is string => typeof arg === 'string' && /^\[.+\]$/.test(arg)
  );
  const originalError = getProp(payload, 'originalError');

  return {
    script,
    error: {
      stage: stage ?? 'unknown',
      message,
      code:
        readString(originalError, 'code') ??
        (codeArg?.slice(1, -1) || undefined),
      nativeMessage: truncate(describeError(originalError).message),
    },
  };
};

const getRecord = (
  store: DevToolsStore,
  scriptId: string,
  caller: string | undefined,
  now: number,
  uniqueId = getScriptUniqueId(scriptId, caller)
) => {
  let record = store.scripts.get(uniqueId);
  if (!record) {
    record = {
      uniqueId,
      scriptId,
      caller,
      status: 'resolving',
      loadCount: 0,
      prefetchCount: 0,
      firstSeenAt: now,
      updatedAt: now,
    };
    store.scripts.set(uniqueId, record);
  }
  return record;
};

const applyScriptObject = (record: ScriptRecord, script: ScriptObject) => {
  record.locator = script.locator ?? record.locator;
  if (script.cache !== undefined) record.cacheEnabled = script.cache;
};

/**
 * Folds one ScriptManager event into the store. Kept free of React Native
 * imports so it can be unit tested.
 */
export const applyScriptManagerEvent = (
  store: DevToolsStore,
  type: ScriptEventType,
  payload: unknown,
  now = Date.now()
) => {
  const event: ScriptEvent = { seq: nextSeq(store), at: now, type };

  switch (type) {
    case 'resolving': {
      const script = toScriptObject(payload);
      if (!script) break;
      const { scriptId, caller } = script;
      const record = getRecord(store, scriptId, caller, now);
      record.status = 'resolving';
      record.resolveStartedAt = now;
      record.resolvedAt = undefined;
      record.resolveMs = undefined;
      record.error = undefined;
      record.updatedAt = now;
      Object.assign(event, {
        uniqueId: record.uniqueId,
        scriptId,
        caller,
      });
      break;
    }
    case 'resolved':
    case 'prefetching':
    case 'loading':
    case 'loaded': {
      const script = toScriptObject(payload);
      if (!script) break;
      const record = getRecord(
        store,
        script.scriptId,
        script.caller,
        now,
        script.uniqueId
      );
      applyScriptObject(record, script);
      record.updatedAt = now;
      if (type === 'resolved') {
        record.status = 'resolved';
        record.resolvedAt = now;
        if (record.resolveStartedAt !== undefined) {
          record.resolveMs = now - record.resolveStartedAt;
        }
      } else if (type === 'prefetching') {
        record.status = 'prefetching';
        record.prefetchCount += 1;
      } else if (type === 'loading') {
        record.status = 'loading';
        record.loadCount += 1;
        record.loadStartedAt = now;
        record.loadedAt = undefined;
        record.loadMs = undefined;
        record.error = undefined;
      } else {
        record.status = 'loaded';
        record.loadedAt = now;
        if (record.loadStartedAt !== undefined) {
          record.loadMs = now - record.loadStartedAt;
        }
      }
      Object.assign(event, {
        uniqueId: record.uniqueId,
        scriptId: record.scriptId,
        caller: record.caller,
        url: record.locator?.url,
        detail:
          type === 'resolved' || type === 'loading'
            ? record.locator?.fetch
              ? 'download'
              : 'cached'
            : undefined,
      });
      break;
    }
    case 'error': {
      const { error, script } = parseScriptManagerError(payload);
      const scriptId = script?.scriptId;
      if (scriptId) {
        const record = getRecord(
          store,
          scriptId,
          script.caller,
          now,
          script.uniqueId
        );
        applyScriptObject(record, script);
        record.status = 'failed';
        record.error = error;
        record.updatedAt = now;
        Object.assign(event, {
          uniqueId: record.uniqueId,
          scriptId,
          caller: record.caller,
          url: record.locator?.url,
        });
      }
      event.detail = [error.stage, error.code, error.nativeMessage]
        .filter(Boolean)
        .join(' | ');
      recordError({
        source: 'script-manager',
        name: error.code,
        message: `${error.message} ${error.nativeMessage ?? ''}`.trim(),
        stack: describeError(getProp(payload, 'originalError')).stack,
        ref: event.uniqueId,
        at: now,
      });
      break;
    }
    case 'invalidated': {
      const ids = toStringArray(payload) ?? [];
      for (const record of store.scripts.values()) {
        if (ids.includes(record.uniqueId) || ids.includes(record.scriptId)) {
          record.status = 'invalidated';
          record.updatedAt = now;
        }
      }
      event.detail = ids.join(', ');
      break;
    }
  }

  pushBounded(store.scriptEvents, event, LIMITS.scriptEvents);
  notify(store);
  return event;
};

const EVENT_TYPES: ScriptEventType[] = [
  'resolving',
  'resolved',
  'prefetching',
  'loading',
  'loaded',
  'error',
  'invalidated',
];

export const attachScriptManager = (scriptManager: ScriptManagerLike) => {
  const store = getStore();
  if (store.hooked.scriptManager) return false;
  store.hooked.scriptManager = true;
  for (const type of EVENT_TYPES) {
    scriptManager.on(type, (payload: unknown) => {
      try {
        applyScriptManagerEvent(getStore(), type, payload);
      } catch {
        // recording must never break script loading
      }
    });
  }
  return true;
};
