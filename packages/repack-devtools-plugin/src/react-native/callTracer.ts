import { LIMITS } from '../shared/constants';
import { getProp, toStringArray } from '../shared/guards';
import type { Diagnostic, ScriptCall, ScriptCallMethod } from '../shared/types';
import { getPromiseState, trackPromise } from './promiseTracker';
import { getScriptUniqueId } from './scriptManagerRecorder';
import {
  type DevToolsStore,
  describeError,
  getStore,
  nextSeq,
  notify,
  pushBounded,
  truncate,
} from './store';

const TRACED_METHODS: ScriptCallMethod[] = [
  'loadScript',
  'prefetchScript',
  'invalidateScripts',
];

const readStoredPromise = (scriptManager: unknown, uniqueId: string) =>
  getProp(getProp(scriptManager, 'scriptsPromises'), uniqueId);

/** Starts a call record; `finish` completes it once the returned promise settles. */
export const beginCall = (
  store: DevToolsStore,
  scriptManager: unknown,
  method: ScriptCallMethod,
  args: unknown[],
  now = Date.now()
) => {
  const call: ScriptCall = {
    seq: nextSeq(store),
    method,
    startedAt: now,
    outcome: 'pending',
    events: [],
    resolverRan: false,
    faults: [],
  };
  // Events with a higher seq than this were caused by (or ran during) the call.
  let eventsAfter = call.seq;
  if (method === 'invalidateScripts') {
    call.scriptIds = toStringArray(args[0]) ?? [];
  } else if (typeof args[0] === 'string') {
    call.scriptId = args[0];
    call.caller = typeof args[1] === 'string' ? args[1] : undefined;
    call.uniqueId = getScriptUniqueId(call.scriptId, call.caller);
    const stored = readStoredPromise(scriptManager, call.uniqueId);
    if (stored instanceof Promise) {
      const state = getPromiseState(stored) ?? trackPromise(stored, now);
      call.joined = {
        isPrefetch: getProp(stored, 'isPrefetch') === true,
        state: state?.state ?? 'unknown',
        ageMs: state ? now - state.since : undefined,
      };
      // loadScript waits for a stored prefetch and then resolves and loads
      // on its own; events before the prefetch settled belong to the
      // prefetch. Registered before ScriptManager's own `await`, so it runs
      // first.
      if (method === 'loadScript' && call.joined.isPrefetch) {
        const mark = () => {
          eventsAfter = store.seq;
        };
        stored.then(mark, mark);
      }
    }
  }
  pushBounded(store.scriptCalls, call, LIMITS.scriptCalls);

  const finish = (error: unknown, failed: boolean, end = Date.now()) => {
    call.endedAt = end;
    call.durationMs = end - call.startedAt;
    call.outcome = failed ? 'error' : 'ok';
    if (failed) call.error = truncate(describeError(error).message);
    // A call that joined a stored load (or any stored promise, for
    // prefetchScript) got that promise back and did no work of its own, even
    // when the attempt it joined emitted events while it waited.
    const reusedOnly =
      call.joined !== undefined &&
      (method === 'prefetchScript' || !call.joined.isPrefetch);
    if (call.uniqueId && !reusedOnly) {
      const events = store.scriptEvents.filter(
        (event) => event.seq > eventsAfter && event.uniqueId === call.uniqueId
      );
      call.events = events.map((event) => event.type);
      call.resolverRan = call.events.includes('resolving');
      if (method === 'prefetchScript' && !failed) {
        const record = store.scripts.get(call.uniqueId);
        if (record?.status === 'prefetching') record.status = 'prefetched';
      }
    }
    notify(store);
  };
  return { call, finish };
};

/**
 * Wraps ScriptManager's public methods on the instance so every call (app
 * code, the webpack chunk runtime, Module Federation, devtools actions) is
 * recorded with its outcome and whether a new attempt actually ran.
 */
export const attachCallTracer = (scriptManager: unknown) => {
  const store = getStore();
  if (store.hooked.callTracer || typeof scriptManager !== 'object') {
    return false;
  }
  if (scriptManager === null) return false;
  store.hooked.callTracer = true;

  for (const method of TRACED_METHODS) {
    const original = getProp(scriptManager, method);
    if (typeof original !== 'function') continue;
    const traced = function (this: unknown, ...args: unknown[]): unknown {
      const target = this ?? scriptManager;
      let tracker: ReturnType<typeof beginCall> | undefined;
      try {
        tracker = beginCall(getStore(), target, method, args);
      } catch {
        // tracing must never break script loading
      }
      const result: unknown = Reflect.apply(original, target, args);
      if (tracker && result instanceof Promise) {
        const { call, finish } = tracker;
        if (call.uniqueId) {
          trackPromise(readStoredPromise(target, call.uniqueId));
        }
        // Hand the caller a derived promise that rethrows instead of
        // `result`: our handler marks `result` as handled, so returning it
        // would hide "Possible unhandled promise rejection" warnings for
        // callers that never catch.
        return result.then(
          (value: unknown) => {
            finish(undefined, false);
            return value;
          },
          (error: unknown) => {
            finish(error, true);
            throw error;
          }
        );
      }
      return result;
    };
    Reflect.set(scriptManager, method, traced);
  }
  return true;
};

/** Calls that got an already-rejected stored promise back. */
export const diagnoseScriptCalls = (calls: ScriptCall[]): Diagnostic[] => {
  const reusedFailures = calls.filter(
    (call) =>
      call.outcome === 'error' &&
      !call.resolverRan &&
      call.joined?.state === 'rejected'
  );
  const byId = new Map<string, ScriptCall[]>();
  for (const call of reusedFailures) {
    const key = call.uniqueId ?? '';
    byId.set(key, [...(byId.get(key) ?? []), call]);
  }
  return Array.from(byId, ([uniqueId, group]) => {
    const latest = group[group.length - 1];
    return {
      severity: 'error',
      area: 'scripts',
      message: `${group.length} ${latest.method} call(s) for "${uniqueId}" failed immediately with a stored error (${latest.error ?? 'unknown'}); resolvers did not run and nothing was downloaded.`,
      hint: 'ScriptManager returned a rejected promise from an earlier attempt. Compare with get-script-manager (promises) to see which attempt is stored.',
      ref: `call:${latest.seq}`,
    };
  });
};
