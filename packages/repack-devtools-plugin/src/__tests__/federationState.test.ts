import { describe, expect, it } from 'vitest';
import {
  diagnoseFederationEvents,
  readFederationState,
  satisfiesRange,
} from '../react-native/federation/state';
import type { FederationEvent } from '../shared/types';

describe('satisfiesRange', () => {
  it.each([
    ['19.2.0', '^19.0.0', true],
    ['18.3.1', '^19.0.0', false],
    ['0.82.1', '^0.82.0', true],
    ['0.83.0', '^0.82.0', false],
    ['1.2.9', '~1.2.3', true],
    ['1.3.0', '~1.2.3', false],
    ['2.0.0', '>=1.0.0', true],
    ['1.0.0', '1.0.0', true],
    ['1.0.0', '*', true],
  ])('%s satisfies %s: %s', (version, range, expected) => {
    expect(satisfiesRange(version, range)).toBe(expected);
  });

  it('returns undefined for ranges it does not understand', () => {
    expect(satisfiesRange('1.0.0', '1.x || 2.x')).toBeUndefined();
  });
});

const shared = (version: string, from: string, loaded: boolean) => ({
  version,
  from,
  loaded: loaded ? 1 : undefined,
  shareConfig: { singleton: true, requiredVersion: '^19.0.0' },
});

describe('readFederationState', () => {
  it('reads MF 2 instances and flags duplicate singletons', () => {
    const state = readFederationState({
      federation: {
        __INSTANCES__: [
          {
            name: 'HostApp',
            options: {
              remotes: [
                { name: 'MiniApp', entry: 'http://localhost:8082/mf.json' },
                { name: 'Unused', entry: 'http://localhost:8083/mf.json' },
              ],
            },
            moduleCache: new Map([['MiniApp', {}]]),
            shareScopeMap: {
              default: {
                react: {
                  '19.2.0': shared('19.2.0', 'HostApp', true),
                  '18.3.1': shared('18.3.1', 'MiniApp', true),
                },
              },
            },
          },
        ],
      },
      runtimePluginInstalled: true,
      events: [],
    });

    expect(state.runtime).toBe('v2');
    expect(state.instances[0].remotes).toEqual([
      expect.objectContaining({ name: 'MiniApp', loaded: true }),
      expect.objectContaining({ name: 'Unused', loaded: false }),
    ]);
    expect(state.diagnostics[0].message).toContain(
      'Singleton "react" is loaded in 2 versions'
    );
  });

  it('flags a loaded shared version that misses a required range', () => {
    const state = readFederationState({
      federation: {
        __INSTANCES__: [
          {
            name: 'HostApp',
            shareScopeMap: {
              default: {
                react: {
                  '18.3.1': shared('18.3.1', 'MiniApp', true),
                  '19.2.0': shared('19.2.0', 'HostApp', false),
                },
              },
            },
          },
        ],
      },
      runtimePluginInstalled: true,
      events: [],
    });
    expect(state.diagnostics.map((item) => item.message)).toContain(
      '"react" 18.3.1 (from MiniApp) is loaded but HostApp requires ^19.0.0.'
    );
  });

  it('reads MF 1 share scopes and suggests the runtime plugin only for v2', () => {
    const v1 = readFederationState({
      webpackShareScopes: {
        default: { react: { '19.2.0': { from: 'host', loaded: 1 } } },
      },
      runtimePluginInstalled: false,
      events: [],
    });
    expect(v1.runtime).toBe('v1');
    expect(v1.shareScopes?.[0]).toMatchObject({ name: 'react' });
    expect(v1.diagnostics).toEqual([]);

    const v2 = readFederationState({
      federation: { __INSTANCES__: [] },
      runtimePluginInstalled: false,
      events: [],
    });
    expect(v2.diagnostics[0].message).toContain('runtime plugin');
  });

  it('flags shared versions copied from package manager protocols', () => {
    const state = readFederationState({
      federation: {
        __INSTANCES__: [
          {
            name: 'HostApp',
            shareScopeMap: {
              default: {
                'react-native-screens': {
                  'catalog:testers': {
                    from: 'HostApp',
                    loaded: 1,
                    shareConfig: {
                      singleton: true,
                      requiredVersion: 'catalog:testers',
                    },
                  },
                },
              },
            },
          },
        ],
      },
      runtimePluginInstalled: true,
      events: [],
    });
    expect(state.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'warning',
        message:
          'Shared "react-native-screens" is registered with requiredVersion "catalog:testers" by HostApp, which is not semver.',
      }),
    ]);
  });

  it('survives unexpected global shapes', () => {
    const state = readFederationState({
      federation: { __INSTANCES__: [null, 'nope', { options: 5 }] },
      runtimePluginInstalled: false,
      events: [],
    });
    expect(state.instances).toHaveLength(3);
  });
});

describe('diagnoseFederationEvents', () => {
  it('points network failures at the remote dev server', () => {
    const [diagnostic] = diagnoseFederationEvents([
      {
        seq: 1,
        at: 0,
        type: 'afterLoadManifest',
        remote: 'MiniApp',
        url: 'http://localhost:8082/android/mf-manifest.json',
        error: 'Network request failed',
      },
    ]);
    expect(diagnostic.hint).toContain('could not reach http://localhost:8082');
  });

  it('reports each distinct failure once', () => {
    const event: FederationEvent = {
      seq: 1,
      at: 0,
      type: 'errorLoadRemote',
      id: 'MiniApp/App',
      error: 'ScriptExternalLoadError',
    };
    const diagnostics = diagnoseFederationEvents([event, { ...event, seq: 2 }]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('MiniApp/App');
  });
});
