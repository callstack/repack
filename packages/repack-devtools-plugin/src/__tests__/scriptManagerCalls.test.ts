import { beforeEach, describe, expect, it } from 'vitest';
import {
  attachCallTracer,
  diagnoseScriptCalls,
} from '../react-native/callTracer';
import { clearScriptFaults, injectScriptFault } from '../react-native/faults';
import { inspectScriptManager } from '../react-native/scriptManagerInspector';
import { applyScriptManagerEvent } from '../react-native/scriptManagerRecorder';
import { getStore } from '../react-native/store';
import { STORE_GLOBAL } from '../shared/constants';

type Hook = (args: { options: Record<string, unknown> }) => Promise<unknown>;
type StoredPromise = Promise<void> & { isPrefetch?: boolean };

/**
 * Mirrors the parts of ScriptManager the tracer, inspector and faults rely
 * on. `fixed: false` keeps the shape from issue #1506: the resolve step runs
 * outside the try/finally that clears `scriptsPromises`.
 */
class FakeScriptManager {
  scriptsPromises: Record<string, StoredPromise> = {};
  cache: Record<string, { url: string }> = {};
  resolvers: Array<[string, number, () => unknown]> = [['default', 0, () => 0]];
  taps: Record<string, Hook[]> = { beforeResolve: [], beforeLoad: [] };
  hookMap = {
    beforeResolve: { taps: this.taps.beforeResolve },
    beforeLoad: { taps: this.taps.beforeLoad },
  };
  hooks = {
    beforeResolve: (fn: Hook) => this.taps.beforeResolve.push(fn),
    beforeLoad: (fn: Hook) => this.taps.beforeLoad.push(fn),
  };
  resolveCount = 0;
  failResolve = 0;

  constructor(private fixed = false) {}

  private async runHooks(name: string, scriptId: string, caller?: string) {
    for (const tap of this.taps[name]) {
      await tap({ options: { scriptId, caller } });
    }
  }

  private async resolveScript(scriptId: string, caller?: string) {
    const uniqueId = caller ? `${caller}_${scriptId}` : scriptId;
    // like ScriptManager, which awaits initCache() before emitting
    await Promise.resolve();
    applyScriptManagerEvent(getStore(), 'resolving', { scriptId, caller });
    await this.runHooks('beforeResolve', scriptId, caller);
    this.resolveCount += 1;
    if (this.failResolve > 0) {
      this.failResolve -= 1;
      throw new Error('Network request failed');
    }
    this.cache[uniqueId] = { url: `http://localhost/${scriptId}.bundle` };
    return uniqueId;
  }

  async loadScript(scriptId: string, caller?: string): Promise<void> {
    const uniqueId = caller ? `${caller}_${scriptId}` : scriptId;
    const stored = this.scriptsPromises[uniqueId];
    if (stored) {
      // a prefetch only downloads, so load after it
      if (stored.isPrefetch) await stored;
      else return stored;
    }
    const run = async () => {
      if (this.fixed) {
        try {
          await this.resolveScript(scriptId, caller);
        } catch (error) {
          delete this.scriptsPromises[uniqueId];
          throw error;
        }
      } else {
        await this.resolveScript(scriptId, caller);
      }
      try {
        await this.runHooks('beforeLoad', scriptId, caller);
      } finally {
        delete this.scriptsPromises[uniqueId];
      }
    };
    const promise: StoredPromise = run();
    this.scriptsPromises[uniqueId] = promise;
    return promise;
  }

  prefetchScript(scriptId: string, caller?: string): Promise<void> {
    const uniqueId = caller ? `${caller}_${scriptId}` : scriptId;
    const stored = this.scriptsPromises[uniqueId];
    if (stored) return stored;
    const promise: StoredPromise = this.resolveScript(scriptId, caller).then(
      () => {
        applyScriptManagerEvent(getStore(), 'prefetching', {
          scriptId,
          caller,
          locator: { uniqueId },
        });
      }
    );
    promise.isPrefetch = true;
    this.scriptsPromises[uniqueId] = promise;
    return promise;
  }

  invalidateScripts(scriptIds: string[] = []) {
    for (const id of scriptIds) {
      delete this.scriptsPromises[id];
      delete this.cache[id];
    }
    return Promise.resolve(scriptIds);
  }
}

const settle = (promise: Promise<unknown>) =>
  promise.then(
    () => 'ok',
    (error: unknown) => (error instanceof Error ? error.message : 'error')
  );

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  Reflect.deleteProperty(globalThis, STORE_GLOBAL);
});

describe('call tracer', () => {
  it('records outcomes and whether resolvers ran', async () => {
    const sm = new FakeScriptManager();
    attachCallTracer(sm);

    expect(await settle(sm.loadScript('miniapp', 'main'))).toBe('ok');
    await tick();

    const [call] = getStore().scriptCalls;
    expect(call).toMatchObject({
      method: 'loadScript',
      uniqueId: 'main_miniapp',
      outcome: 'ok',
      resolverRan: true,
    });
    expect(call.joined).toBeUndefined();
    expect(call.events).toEqual(['resolving']);
  });

  it('shows retries that reuse a stored rejected promise (#1506)', async () => {
    const sm = new FakeScriptManager();
    attachCallTracer(sm);
    sm.failResolve = 1;

    expect(await settle(sm.loadScript('miniapp', 'main'))).toBe(
      'Network request failed'
    );
    await tick();
    expect(await settle(sm.loadScript('miniapp', 'main'))).toBe(
      'Network request failed'
    );
    expect(await settle(sm.prefetchScript('miniapp', 'main'))).toBe(
      'Network request failed'
    );
    await tick();

    expect(sm.resolveCount).toBe(1);
    const [first, retry, prefetch] = getStore().scriptCalls;
    expect(first).toMatchObject({ resolverRan: true, outcome: 'error' });
    expect(retry).toMatchObject({
      outcome: 'error',
      resolverRan: false,
      joined: { isPrefetch: false, state: 'rejected' },
    });
    expect(prefetch).toMatchObject({ resolverRan: false, outcome: 'error' });

    const diagnostics = diagnoseScriptCalls(getStore().scriptCalls);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: 'error',
      ref: `call:${prefetch.seq}`,
    });
    expect(diagnostics[0].message).toContain('2 ');

    const state = await inspectScriptManager(sm);
    expect(state.promises).toEqual([
      expect.objectContaining({
        uniqueId: 'main_miniapp',
        state: 'rejected',
        error: 'Network request failed',
      }),
    ]);
    expect(state.diagnostics[0]).toMatchObject({
      severity: 'error',
      ref: 'main_miniapp',
    });
  });

  it('reports a clean state once the failure is not kept', async () => {
    const sm = new FakeScriptManager(true);
    attachCallTracer(sm);
    sm.failResolve = 1;

    await settle(sm.loadScript('miniapp', 'main'));
    await tick();
    expect(await settle(sm.loadScript('miniapp', 'main'))).toBe('ok');
    await tick();

    expect(sm.resolveCount).toBe(2);
    expect(getStore().scriptCalls[1]).toMatchObject({
      resolverRan: true,
      outcome: 'ok',
    });
    expect(diagnoseScriptCalls(getStore().scriptCalls)).toEqual([]);
    expect((await inspectScriptManager(sm)).diagnostics).toEqual([]);
  });

  it('does not credit a joined call with the attempt it joined', async () => {
    const sm = new FakeScriptManager(true);
    attachCallTracer(sm);
    await Promise.all([
      sm.loadScript('miniapp', 'main'),
      sm.loadScript('miniapp', 'main'),
    ]);
    await tick();

    expect(sm.resolveCount).toBe(1);
    const [first, second] = getStore().scriptCalls;
    expect(first).toMatchObject({ resolverRan: true });
    expect(second).toMatchObject({
      resolverRan: false,
      events: [],
      joined: { isPrefetch: false, state: 'pending' },
    });
  });

  it('credits a load that waited for a prefetch with its own resolve only', async () => {
    const sm = new FakeScriptManager(true);
    attachCallTracer(sm);
    sm.failResolve = 0;
    const prefetch = sm.prefetchScript('miniapp', 'main');
    // joins the in-flight prefetch, then resolves and loads on its own
    const load = sm.loadScript('miniapp', 'main');
    await Promise.all([prefetch, load]);
    await tick();
    const loadCall = getStore().scriptCalls.find(
      (call) => call.method === 'loadScript'
    );
    expect(loadCall).toMatchObject({ resolverRan: true });
    expect(loadCall?.events).toEqual(['resolving']);
  });

  it('keeps rejections unhandled for callers that do not catch', async () => {
    const sm = new FakeScriptManager();
    let original: Promise<void> | undefined;
    const load = sm.loadScript.bind(sm);
    sm.loadScript = (scriptId, caller) => {
      original = load(scriptId, caller);
      return original;
    };
    attachCallTracer(sm);
    sm.failResolve = 1;
    const returned = sm.loadScript('miniapp', 'main');
    // a derived promise, so the tracer's handler on the original one does
    // not count as the caller's
    expect(returned).not.toBe(original);
    await expect(returned).rejects.toThrow('Network request failed');
  });

  it('marks a finished prefetch as prefetched', async () => {
    const sm = new FakeScriptManager(true);
    attachCallTracer(sm);
    await sm.prefetchScript('miniapp', 'main');
    await tick();
    expect(getStore().scripts.get('main_miniapp')?.status).toBe('prefetched');
  });
});

describe('inspector', () => {
  it('reads resolvers, hook taps and cache', async () => {
    const sm = new FakeScriptManager(true);
    await sm.loadScript('miniapp', 'main');
    injectScriptFault(sm, { stage: 'load', times: 0 });
    const state = await inspectScriptManager(sm);
    expect(state).toMatchObject({
      available: true,
      resolvers: [{ key: 'default', priority: 0 }],
      hooks: { beforeResolve: 1, beforeLoad: 1 },
      cache: [
        { uniqueId: 'main_miniapp', url: 'http://localhost/miniapp.bundle' },
      ],
      storage: false,
    });
  });

  it('is unavailable for non-objects', async () => {
    expect((await inspectScriptManager(undefined)).available).toBe(false);
  });
});

describe('script faults', () => {
  it('fails the resolve stage a limited number of times', async () => {
    const sm = new FakeScriptManager(true);
    attachCallTracer(sm);
    const fault = injectScriptFault(sm, {
      stage: 'resolve',
      scriptId: 'miniapp',
      times: 1,
    });

    expect(await settle(sm.loadScript('miniapp', 'main'))).toBe(
      'Network request failed (injected)'
    );
    expect(await settle(sm.loadScript('other', 'main'))).toBe('ok');
    expect(await settle(sm.loadScript('miniapp', 'main'))).toBe('ok');

    expect(fault).toMatchObject({ hits: 1, remaining: 0 });
    expect(getStore().scriptCalls[0].faults).toEqual([fault.id]);
    expect(getStore().scriptCalls[2].faults).toEqual([]);
  });

  it('fails the load stage with a NetworkFailure code', async () => {
    const sm = new FakeScriptManager(true);
    injectScriptFault(sm, { stage: 'load' });
    const error = await sm.loadScript('miniapp').catch((e: unknown) => e);
    expect(error).toMatchObject({
      message: 'Script download failed (injected)',
      code: 'NetworkFailure',
    });
  });

  it('delays without failing, and installs hooks only once', async () => {
    const sm = new FakeScriptManager(true);
    injectScriptFault(sm, { stage: 'resolve', action: 'delay', delayMs: 30 });
    injectScriptFault(sm, { stage: 'load', action: 'delay', delayMs: 0 });
    const startedAt = Date.now();
    await sm.loadScript('miniapp');
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(25);
    expect(sm.taps.beforeResolve).toHaveLength(1);
  });

  it('clears one or all faults', () => {
    const sm = new FakeScriptManager(true);
    const first = injectScriptFault(sm, { stage: 'resolve' });
    injectScriptFault(sm, { stage: 'load' });
    expect(clearScriptFaults(first.id)).toBe(1);
    expect(getStore().faults).toHaveLength(1);
    expect(clearScriptFaults()).toBe(1);
    expect(getStore().faults).toEqual([]);
  });
});
