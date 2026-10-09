import type { FederationManifest } from '../../../plugins/federationManifest/types.js';
import { formatManifest } from '../inspect.js';
import hostFixture from './__fixtures__/host.json';
import remoteConflictingFixture from './__fixtures__/remote-conflicting.json';

const host = hostFixture as unknown as FederationManifest;
const remote = remoteConflictingFixture as unknown as FederationManifest;

describe('formatManifest', () => {
  it('renders the core identity, shared deps, remotes and native block', () => {
    const output = formatManifest(host);

    expect(output).toContain('shell');
    expect(output).toContain('type:');
    expect(output).toContain('host');
    expect(output).toContain('build:');
    expect(output).toContain('abc1234');

    expect(output).toContain('shared');
    expect(output).toContain('react');
    expect(output).toContain('19.0.0');
    expect(output).toContain('^19.0.0');
    expect(output).toContain('singleton');

    expect(output).toContain('remotes');
    expect(output).toContain('store');
    expect(output).toContain('http://localhost:5001/store.container.js');

    expect(output).toContain('react-native');
    expect(output).toContain('0.79.2');
    expect(output).toContain('react-native-reanimated');
    expect(output).toContain('turbo-module');
    expect(output).toContain('static');
  });

  it('renders exposes and the heuristic note', () => {
    const output = formatManifest(remote);

    expect(output).toContain('exposes');
    expect(output).toContain('Checkout');
    expect(output).toContain('./src/Checkout');

    const withNote = JSON.parse(JSON.stringify(remote)) as FederationManifest;
    withNote.reactNative.note = 'Native module list may be incomplete.';

    expect(formatManifest(withNote)).toContain(
      'note: Native module list may be incomplete.'
    );
  });
});
