import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyScriptManagerEvent,
  parseScriptManagerError,
} from '../react-native/scriptManagerRecorder';
import { getStore } from '../react-native/store';
import { STORE_GLOBAL } from '../shared/constants';

const script = (overrides: Record<string, unknown> = {}) => ({
  scriptId: 'src_Async_tsx',
  caller: 'main',
  cache: true,
  locator: {
    uniqueId: 'main_src_Async_tsx',
    url: 'http://localhost:8081/android/src_Async_tsx.chunk.bundle',
    fetch: true,
    timeout: 30000,
    headers: { Accept: 'application/javascript', bogus: 1 },
  },
  ...overrides,
});

describe('applyScriptManagerEvent', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, STORE_GLOBAL);
  });

  it('tracks a script from resolving to loaded with timings', () => {
    const store = getStore();
    applyScriptManagerEvent(
      store,
      'resolving',
      { scriptId: 'src_Async_tsx', caller: 'main' },
      1000
    );
    applyScriptManagerEvent(store, 'resolved', script(), 1010);
    applyScriptManagerEvent(store, 'loading', script(), 1020);
    applyScriptManagerEvent(store, 'loaded', script(), 1120);

    const record = store.scripts.get('main_src_Async_tsx');
    expect(record).toMatchObject({
      scriptId: 'src_Async_tsx',
      caller: 'main',
      status: 'loaded',
      cacheEnabled: true,
      loadCount: 1,
      resolveMs: 10,
      loadMs: 100,
    });
    expect(record?.locator?.url).toBe(
      'http://localhost:8081/android/src_Async_tsx.chunk.bundle'
    );
    expect(record?.locator?.headers).toEqual({
      Accept: 'application/javascript',
    });
    expect(store.scriptEvents.map((event) => event.type)).toEqual([
      'resolving',
      'resolved',
      'loading',
      'loaded',
    ]);
    expect(store.scriptEvents[1].detail).toBe('download');
  });

  it('marks the script failed and records an error with the native message', () => {
    const store = getStore();
    applyScriptManagerEvent(store, 'loading', script(), 1000);
    applyScriptManagerEvent(
      store,
      'error',
      {
        message: 'Failed to load script:',
        args: ['[ScriptManager]', script()],
        originalError: Object.assign(
          new Error('Request failed with status code 404'),
          { code: 'NetworkFailure' }
        ),
      },
      1500
    );

    const record = store.scripts.get('main_src_Async_tsx');
    expect(record?.status).toBe('failed');
    expect(record?.error).toEqual({
      stage: 'load',
      message: 'Failed to load script:',
      code: 'NetworkFailure',
      nativeMessage: 'Request failed with status code 404',
    });
    expect(store.errors).toHaveLength(1);
    expect(store.errors[0]).toMatchObject({
      source: 'script-manager',
      ref: 'main_src_Async_tsx',
    });
  });

  it('marks invalidated scripts by unique id or script id', () => {
    const store = getStore();
    applyScriptManagerEvent(store, 'loaded', script(), 1000);
    applyScriptManagerEvent(store, 'invalidated', ['src_Async_tsx'], 1100);
    expect(store.scripts.get('main_src_Async_tsx')?.status).toBe('invalidated');
  });

  it('ignores payloads without a script id instead of throwing', () => {
    const store = getStore();
    applyScriptManagerEvent(store, 'loaded', { nope: true }, 1000);
    expect(store.scripts.size).toBe(0);
    expect(store.scriptEvents).toHaveLength(1);
  });
});

describe('parseScriptManagerError', () => {
  it('infers the stage from the message and a [CODE] argument', () => {
    const { error, script: parsed } = parseScriptManagerError({
      message: 'Failed while resolving script locator:',
      args: ['[ResolverError]', { scriptId: 'Remote', caller: undefined }],
      originalError: 'no resolver matched',
    });
    expect(error.stage).toBe('resolve');
    expect(error.code).toBe('ResolverError');
    expect(error.nativeMessage).toBe('no resolver matched');
    expect(parsed?.scriptId).toBe('Remote');
  });

  it('handles non-object payloads', () => {
    expect(parseScriptManagerError(undefined).error).toMatchObject({
      stage: 'unknown',
      message: 'Unknown ScriptManager error',
    });
  });
});
