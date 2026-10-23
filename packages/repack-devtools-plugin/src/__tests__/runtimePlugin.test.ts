import { beforeEach, describe, expect, it } from 'vitest';
import { createRepackDevToolsRuntimePlugin } from '../react-native/federation/runtimePlugin';
import { getStore } from '../react-native/store';
import { STORE_GLOBAL } from '../shared/constants';

beforeEach(() => {
  Reflect.deleteProperty(globalThis, STORE_GLOBAL);
});

describe('runtime plugin', () => {
  it('records every hook without throwing, even with minimal args', () => {
    const plugin = createRepackDevToolsRuntimePlugin();
    const hooks = Object.entries(plugin).filter(
      (entry): entry is [string, (args: unknown) => unknown] =>
        typeof entry[1] === 'function'
    );
    expect(hooks.length).toBeGreaterThan(5);
    for (const [name, hook] of hooks) {
      expect(() => hook({ id: 'MiniApp/App' }), name).not.toThrow();
    }
  });

  it('keeps the manifest HTTP status', () => {
    const plugin = createRepackDevToolsRuntimePlugin();
    plugin.afterLoadManifest({
      manifestUrl: 'http://localhost:8082/android/mf-manifest.json',
      error: new SyntaxError('JSON Parse error: Unexpected character: I'),
      response: { status: 503 },
    });
    expect(getStore().federationEvents.at(-1)).toMatchObject({
      type: 'afterLoadManifest',
      detail: 'HTTP 503',
    });
  });
});
