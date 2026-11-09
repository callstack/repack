import {
  callMethod,
  getProp,
  isRecord,
  readArray,
  readString,
} from '../shared/guards';
import type {
  Diagnostic,
  ScriptManagerState,
  StoredScriptPromise,
} from '../shared/types';
import {
  flushPromiseStates,
  getPromiseState,
  trackPromise,
} from './promiseTracker';

const HOOK_NAMES = [
  'beforeResolve',
  'resolve',
  'afterResolve',
  'errorResolve',
  'beforeLoad',
  'load',
  'afterLoad',
  'errorLoad',
];

/**
 * ScriptManager keeps in-flight and finished-but-not-cleared load promises
 * in `scriptsPromises`. A loadScript/prefetchScript for a key that is still
 * there gets the stored promise back instead of a new attempt.
 */
export const readStoredPromises = (
  scriptManager: unknown,
  now = Date.now()
): StoredScriptPromise[] => {
  const promises = getProp(scriptManager, 'scriptsPromises');
  if (!isRecord(promises)) return [];
  return Object.entries(promises)
    .filter(([, promise]) => promise instanceof Promise)
    .map(([uniqueId, promise]) => {
      const tracked = getPromiseState(promise) ?? trackPromise(promise, now);
      return {
        uniqueId,
        isPrefetch: getProp(promise, 'isPrefetch') === true,
        state: tracked?.state ?? 'unknown',
        error: tracked?.error,
        ageMs: tracked ? now - tracked.since : undefined,
      };
    });
};

export const diagnoseStoredPromises = (
  promises: StoredScriptPromise[]
): Diagnostic[] =>
  promises
    .filter((entry) => entry.state === 'rejected')
    .map((entry) => ({
      severity: 'error',
      area: 'scripts',
      message: `ScriptManager keeps a rejected ${entry.isPrefetch ? 'prefetchScript' : 'loadScript'} promise for "${entry.uniqueId}" (${entry.error ?? 'unknown error'}). Later loadScript/prefetchScript calls for it return this failure without running resolvers or downloading again.`,
      hint: 'A rejected promise that stays in scriptsPromises means the failure happened on a path that skips the cleanup in ScriptManager (see list-script-calls: joined.state=rejected, resolverRan=false). invalidate-scripts with this unique id removes it.',
      ref: entry.uniqueId,
    }));

/** Snapshot of ScriptManager internals; waits a tick so settled states are known. */
export const inspectScriptManager = async (
  scriptManager: unknown
): Promise<ScriptManagerState> => {
  if (!isRecord(scriptManager)) {
    return {
      available: false,
      promises: [],
      resolvers: [],
      hooks: {},
      storage: false,
      cache: [],
      diagnostics: [],
    };
  }
  readStoredPromises(scriptManager);
  await flushPromiseStates();
  const promises = readStoredPromises(scriptManager);

  const resolvers = readArray(scriptManager, 'resolvers')
    .filter(Array.isArray)
    .map((entry) => ({
      key: typeof entry[0] === 'string' ? entry[0] : String(entry[0]),
      priority:
        typeof entry[1] === 'number' || typeof entry[1] === 'string'
          ? entry[1]
          : String(entry[1]),
    }));

  const hookMap = getProp(scriptManager, 'hookMap');
  const hooks = Object.fromEntries(
    HOOK_NAMES.map((name) => {
      const hook = getProp(hookMap, name);
      const taps = getProp(hook, 'taps');
      return [
        name,
        Array.isArray(taps)
          ? taps.length
          : callMethod(hook, 'isUsed', []) === true
            ? 1
            : 0,
      ];
    })
  );

  const cacheMap = getProp(scriptManager, 'cache');
  const cache = isRecord(cacheMap)
    ? Object.entries(cacheMap).map(([uniqueId, entry]) => ({
        uniqueId,
        url: readString(entry, 'url'),
        query: readString(entry, 'query'),
      }))
    : [];

  return {
    available: true,
    promises,
    resolvers,
    hooks,
    storage: getProp(scriptManager, 'storage') !== undefined,
    cache,
    diagnostics: diagnoseStoredPromises(promises),
  };
};
