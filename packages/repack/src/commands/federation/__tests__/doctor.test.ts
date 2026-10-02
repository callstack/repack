import type { FederationManifest } from '../../../plugins/federationManifest/types.js';
import {
  doctorExitCode,
  doctorReportToJson,
  formatDoctorReport,
  runDoctor,
} from '../doctor.js';
import { rangesIntersect } from '../semverRange.js';
import hostFixture from './__fixtures__/host.json';
import remoteCleanFixture from './__fixtures__/remote-clean.json';
import remoteConflictingFixture from './__fixtures__/remote-conflicting.json';

const host = hostFixture as unknown as FederationManifest;
const remoteClean = remoteCleanFixture as unknown as FederationManifest;
const remoteConflicting =
  remoteConflictingFixture as unknown as FederationManifest;

function clone(manifest: FederationManifest): FederationManifest {
  return JSON.parse(JSON.stringify(manifest)) as FederationManifest;
}

function codes(report: ReturnType<typeof runDoctor>): string[] {
  return report.findings.map((finding) => finding.code);
}

function findingFor(code: string) {
  const report = runDoctor({
    host,
    remotes: [{ name: 'store', manifest: remoteConflicting }],
  });
  const finding = report.findings.find((entry) => entry.code === code);
  if (!finding) throw new Error(`No ${code} finding in ${codes(report)}`);
  return finding;
}

describe('runDoctor', () => {
  it('reports nothing for a matching host and remote', () => {
    const report = runDoctor({
      host,
      remotes: [{ name: 'store', manifest: remoteClean }],
    });

    expect(report.findings).toEqual([]);
    expect(doctorExitCode(report)).toBe(0);
  });

  it('flags a singleton version drift naming both versions', () => {
    const finding = findingFor('SHARED_VERSION_DRIFT');

    expect(finding.severity).toBe('error');
    expect(finding.message).toContain('react');
    expect(finding.message).toContain('19.0.0');
    expect(finding.message).toContain('19.1.0');
    expect(finding.message).toContain('shell');
    expect(finding.message).toContain('store');
  });

  it('warns when declared ranges cannot intersect', () => {
    const finding = findingFor('SHARED_RANGE_UNRESOLVABLE');

    expect(finding.severity).toBe('warning');
    expect(finding.message).toContain('react-native');
    expect(finding.message).toContain('~0.79.2');
    expect(finding.message).toContain('~0.74.5');
  });

  it('flags a singleton mismatch as error and the conventional eager mismatch as an advisory', () => {
    const singleton = findingFor('SINGLETON_MISMATCH');
    expect(singleton.severity).toBe('error');
    expect(singleton.message).toContain('true');
    expect(singleton.message).toContain('false');

    // The conflicting fixture puts react-native eager: true on the host and
    // eager: false on the remote — the expected host-eager/remote-lazy
    // convention — so it is an advisory, not an error.
    const eager = findingFor('EAGER_ADVISORY');
    expect(eager.severity).toBe('warning');
    expect(eager.message).toContain('true');
    expect(eager.message).toContain('false');
    expect(eager.message).toContain('host-eager/remote-lazy convention');

    const report = runDoctor({
      host,
      remotes: [{ name: 'store', manifest: remoteConflicting }],
    });
    expect(codes(report)).not.toContain('EAGER_MISMATCH');
  });

  it('errors on a reverse eager mismatch keeping the legacy message byte-identical', () => {
    const lazyHost = clone(host);
    const eagerRemote = clone(remoteConflicting);
    // react-native: host eager: false against remote eager: true — no
    // convention orders this; it stays the legacy EAGER_MISMATCH error.
    lazyHost.shared[1]!.eager = false;
    eagerRemote.shared[1]!.eager = true;

    const report = runDoctor({
      host: lazyHost,
      remotes: [{ name: 'store', manifest: eagerRemote }],
    });

    const eager = report.findings.find(
      (finding) => finding.code === 'EAGER_MISMATCH'
    );
    expect(eager?.severity).toBe('error');
    expect(eager?.message).toBe(
      'Shared dependency "react-native" is eager: false on host "shell" but true on remote "store".'
    );
    expect(codes(report)).not.toContain('EAGER_ADVISORY');
  });

  it('exits 0 when the conventional eager advisory is the only finding', () => {
    const lazyRemote = clone(remoteClean);
    lazyRemote.shared[0]!.eager = false;

    const report = runDoctor({
      host,
      remotes: [{ name: 'store', manifest: lazyRemote }],
    });

    expect(codes(report)).toEqual(['EAGER_ADVISORY']);
    expect(doctorExitCode(report)).toBe(0);
  });

  it('errors when a remote native module is absent from a trusted host list', () => {
    const finding = findingFor('MISSING_NATIVE_MODULE');

    expect(finding.severity).toBe('error');
    expect(finding.message).toContain('react-native-maps');
    expect(finding.message).toContain('store');
    expect(finding.message).toMatch(
      /if the host provides this module from its app project rather than node_modules, verify manually/i
    );
  });

  it('downgrades the native-module finding to an advisory when the host uses dynamic imports', () => {
    const dynamicHost = clone(host);
    dynamicHost.reactNative.dynamicImportDetected = true;

    const report = runDoctor({
      host: dynamicHost,
      remotes: [{ name: 'store', manifest: remoteConflicting }],
    });

    expect(codes(report)).not.toContain('MISSING_NATIVE_MODULE');
    expect(codes(report)).toContain('HEURISTIC_ADVISORY');
    const advisory = report.findings.find(
      (finding) => finding.code === 'HEURISTIC_ADVISORY'
    );
    expect(advisory?.severity).toBe('warning');
    expect(advisory?.message).toContain('verify manually');
  });

  it('downgrades the native-module finding when the host list is heuristic', () => {
    const heuristicHost = clone(host);
    heuristicHost.reactNative.nativeModules[0]!.confidence = 'heuristic';

    const report = runDoctor({
      host: heuristicHost,
      remotes: [{ name: 'store', manifest: remoteConflicting }],
    });

    expect(codes(report)).not.toContain('MISSING_NATIVE_MODULE');
    expect(codes(report)).toContain('HEURISTIC_ADVISORY');
  });

  it('notes an unknown singleton version without failing', () => {
    const unknownRemote = clone(remoteClean);
    unknownRemote.shared[0]!.version = 'unknown';

    const report = runDoctor({
      host,
      remotes: [{ name: 'store', manifest: unknownRemote }],
    });

    expect(codes(report)).toContain('VERSION_UNKNOWN');
    expect(doctorExitCode(report)).toBe(0);
  });

  it('errors on a missing remote manifest, warning when allowed', () => {
    const strict = runDoctor({
      host,
      remotes: [{ name: 'payments', missing: true }],
    });
    const missing = strict.findings.find(
      (finding) => finding.code === 'MISSING_REMOTE_MANIFEST'
    );
    expect(missing?.severity).toBe('error');
    expect(missing?.message).toContain('payments');
    expect(missing?.message).toContain('manifest: true');
    expect(doctorExitCode(strict)).toBe(1);

    const lenient = runDoctor({
      host,
      remotes: [{ name: 'payments', missing: true }],
      allowMissingManifests: true,
    });
    expect(
      lenient.findings.find(
        (finding) => finding.code === 'MISSING_REMOTE_MANIFEST'
      )?.severity
    ).toBe('warning');
    expect(doctorExitCode(lenient)).toBe(0);
  });

  it('warns about a newer manifest version but keeps comparing', () => {
    const newerRemote = clone(remoteClean);
    newerRemote.manifestVersion = 2 as 1;

    const report = runDoctor({
      host,
      remotes: [{ name: 'store', manifest: newerRemote }],
    });

    const versionFinding = report.findings.find(
      (finding) => finding.code === 'MANIFEST_VERSION_AHEAD'
    );
    expect(versionFinding?.severity).toBe('warning');
    expect(versionFinding?.message).toContain('2');
    // Comparison still ran: no spurious errors were introduced.
    expect(doctorExitCode(report)).toBe(0);
  });

  it('maps any error finding to exit code 1', () => {
    const report = runDoctor({
      host,
      remotes: [{ name: 'store', manifest: remoteConflicting }],
    });

    expect(doctorExitCode(report)).toBe(1);
  });
});

describe('doctor report rendering', () => {
  it('renders a clean summary and lists findings with their codes', () => {
    const clean = runDoctor({
      host,
      remotes: [{ name: 'store', manifest: remoteClean }],
    });
    expect(formatDoctorReport(clean)).toContain('no issues found');

    const report = runDoctor({
      host,
      remotes: [{ name: 'store', manifest: remoteConflicting }],
    });
    const text = formatDoctorReport(report);
    expect(text).toContain('SHARED_VERSION_DRIFT');
    expect(text).toContain('error');
  });

  it('serializes findings with a stable key order', () => {
    const report = runDoctor({
      host,
      remotes: [{ name: 'store', manifest: remoteConflicting }],
    });

    const parsed = JSON.parse(doctorReportToJson(report)) as {
      findings: Array<Record<string, unknown>>;
    };
    for (const finding of parsed.findings) {
      expect(Object.keys(finding)).toEqual(['severity', 'code', 'message']);
    }
  });
});

describe('doctor extensions', () => {
  describe('frozen host↔remote message text', () => {
    it('keeps host↔remote shared-dep messages byte-identical', () => {
      const report = runDoctor({
        host,
        remotes: [{ name: 'store', manifest: remoteConflicting }],
      });
      const messageFor = (code: string) =>
        report.findings.find((finding) => finding.code === code)!.message;

      expect(messageFor('SINGLETON_MISMATCH')).toBe(
        'Shared dependency "zustand" is singleton: true on host "shell" but false on remote "store".'
      );
      expect(messageFor('SHARED_VERSION_DRIFT')).toBe(
        'Singleton shared dependency "react" resolves to different versions: host "shell" has 19.0.0, remote "store" has 19.1.0. Align the versions (or remove singleton).'
      );
      expect(messageFor('SHARED_RANGE_UNRESOLVABLE')).toBe(
        'Shared dependency "react-native" declares ranges that cannot intersect: host "shell" requires ~0.79.2, remote "store" requires ~0.74.5.'
      );
      expect(messageFor('EAGER_ADVISORY')).toBe(
        'Shared dependency "react-native" is eager: true on host "shell" but eager: false on remote "store" — expected host-eager/remote-lazy convention; reported as advisory.'
      );
    });
  });

  describe('--pairwise remote↔remote comparisons', () => {
    // Both remotes match the host everywhere; they only drift from EACH
    // OTHER on `extra-lib`, which the host does not share at all.
    function driftingPair(): [FederationManifest, FederationManifest] {
      const one = clone(remoteClean);
      const two = clone(remoteClean);
      one.shared.push({
        name: 'extra-lib',
        version: '1.0.0',
        singleton: true,
        eager: true,
        requiredVersion: '^1.0.0',
      });
      two.shared.push({
        name: 'extra-lib',
        version: '2.0.0',
        singleton: true,
        eager: true,
        requiredVersion: '^2.0.0',
      });
      return [one, two];
    }

    it('does not compare remotes with each other by default', () => {
      const [one, two] = driftingPair();
      const report = runDoctor({
        host,
        remotes: [
          { name: 'one', manifest: one },
          { name: 'two', manifest: two },
        ],
      });

      expect(report.findings).toEqual([]);
    });

    it('finds remote↔remote shared drift, naming both remotes, when enabled', () => {
      const [one, two] = driftingPair();
      const report = runDoctor({
        host,
        remotes: [
          { name: 'one', manifest: one },
          { name: 'two', manifest: two },
        ],
        pairwise: true,
      });

      const drift = report.findings.find(
        (finding) => finding.code === 'SHARED_VERSION_DRIFT'
      );
      expect(drift?.severity).toBe('error');
      expect(drift?.message).toContain('remote "one" has 1.0.0');
      expect(drift?.message).toContain('remote "two" has 2.0.0');
      expect(doctorExitCode(report)).toBe(1);
    });

    it('treats any remote↔remote eager mismatch as an advisory in both directions', () => {
      const build = () => {
        const one = clone(remoteClean);
        const two = clone(remoteClean);
        one.shared[0]!.eager = true;
        two.shared[0]!.eager = false;
        return [one, two] as [FederationManifest, FederationManifest];
      };

      for (const swap of [false, true]) {
        const [a, b] = build();
        const report = runDoctor({
          host,
          remotes: swap
            ? [
                { name: 'two', manifest: b },
                { name: 'one', manifest: a },
              ]
            : [
                { name: 'one', manifest: a },
                { name: 'two', manifest: b },
              ],
          pairwise: true,
        });

        expect(codes(report)).not.toContain('EAGER_MISMATCH');
        const pairAdvisories = report.findings.filter((finding) =>
          finding.message.includes('no convention orders two remotes')
        );
        expect(pairAdvisories).toHaveLength(1);
        expect(pairAdvisories[0]!.severity).toBe('warning');
        expect(pairAdvisories[0]!.message).toContain('remote "one"');
        expect(pairAdvisories[0]!.message).toContain('remote "two"');
        // The pair advisory alone never fails the run.
        expect(doctorExitCode(report)).toBe(0);
      }
    });

    it('emits no native findings for remote↔remote pairs', () => {
      const conflicting = clone(remoteConflicting);
      const clean = clone(remoteClean);
      const report = runDoctor({
        host,
        remotes: [
          { name: 'one', manifest: conflicting },
          { name: 'two', manifest: clean },
        ],
        pairwise: true,
      });

      const native = report.findings.filter(
        (finding) =>
          finding.code === 'MISSING_NATIVE_MODULE' ||
          finding.code === 'HEURISTIC_ADVISORY'
      );
      // Exactly the host↔remote finding for "one"; no remote↔remote native
      // findings can name "two" without the host (the host is the provider).
      expect(native).toHaveLength(1);
      expect(native[0]!.message).toContain('remote "one"');
      expect(native[0]!.message).toContain('host "shell"');
      expect(native[0]!.message).not.toContain('remote "two"');
    });
  });

  describe('host-native-first ordering without fail-fast', () => {
    function orderingRemotes(): [
      { name: string; manifest: FederationManifest },
      { name: string; manifest: FederationManifest },
    ] {
      // Drift-heavy but native-clean remote, listed FIRST: before bucketing
      // its shared findings led the report.
      const drifty = clone(remoteConflicting);
      drifty.reactNative.nativeModules =
        drifty.reactNative.nativeModules.filter(
          (entry) => entry.package === 'react-native-reanimated'
        );
      // Native-offending but shared-clean remote, listed SECOND.
      const nativy = clone(remoteClean);
      nativy.reactNative.nativeModules.push({
        package: 'react-native-maps',
        version: '1.20.1',
        modules: undefined,
        turboModule: false,
        confidence: 'static',
      } as (typeof nativy.reactNative.nativeModules)[number]);
      return [
        { name: 'drifty', manifest: drifty },
        { name: 'nativy', manifest: nativy },
      ];
    }

    it('lists native findings before shared findings and covers every remote', () => {
      const report = runDoctor({ host, remotes: orderingRemotes() });
      const codes = report.findings.map((finding) => finding.code);

      expect(codes).toContain('MISSING_NATIVE_MODULE');
      expect(codes).toContain('SHARED_VERSION_DRIFT');
      expect(codes.indexOf('MISSING_NATIVE_MODULE')).toBeLessThan(
        codes.indexOf('SHARED_VERSION_DRIFT')
      );
      // No fail-fast: the second remote's finding is present even though the
      // first remote already produced errors.
      expect(
        report.findings
          .filter((finding) => finding.code === 'SHARED_VERSION_DRIFT')
          .map((finding) => finding.message)
          .join()
      ).toContain('drifty');
      expect(
        report.findings
          .filter((finding) => finding.code === 'MISSING_NATIVE_MODULE')
          .map((finding) => finding.message)
          .join()
      ).toContain('nativy');
      expect(doctorExitCode(report)).toBe(1);
    });

    it('emits manifest-meta findings last, after every comparison ran', () => {
      const newerHost = clone(host);
      newerHost.manifestVersion = 2 as 1;
      const report = runDoctor({
        host: newerHost,
        remotes: [
          { name: 'store', manifest: remoteConflicting },
          { name: 'payments', missing: true },
        ],
      });
      const codes = report.findings.map((finding) => finding.code);

      const metaIndexes = [
        codes.indexOf('MANIFEST_VERSION_AHEAD'),
        codes.indexOf('MISSING_REMOTE_MANIFEST'),
      ];
      const realIndexes = [
        codes.indexOf('SHARED_VERSION_DRIFT'),
        codes.indexOf('MISSING_NATIVE_MODULE'),
      ];
      expect(codes).toContain('MANIFEST_VERSION_AHEAD');
      expect(codes).toContain('MISSING_REMOTE_MANIFEST');
      // Meta findings are emitted as a bucket after native and shared ones.
      expect(Math.min(...metaIndexes)).toBeGreaterThan(
        Math.max(...realIndexes)
      );
    });

    it('keeps the JSON array in report order', () => {
      const report = runDoctor({ host, remotes: orderingRemotes() });
      const parsed = JSON.parse(doctorReportToJson(report)) as {
        findings: Array<{ code: string }>;
      };

      expect(parsed.findings.map((finding) => finding.code)).toEqual(
        report.findings.map((finding) => finding.code)
      );
    });
  });
});

describe('rangesIntersect', () => {
  it.each([
    // caret
    ['^15.0.0', '^15.4.0', true],
    ['^15.0.0', '^16.0.0', false],
    ['^0.74.5', '^0.74.9', true],
    ['^0.74.5', '^0.75.0', false],
    ['^0.0.3', '^0.0.4', false],
    // tilde
    ['~0.74.5', '~0.74.9', true],
    ['~0.74.5', '~0.75.0', false],
    ['~1.2.3', '~1.3.0', false],
    // exact
    ['19.0.0', '19.0.0', true],
    ['19.0.0', '19.0.1', false],
    ['19.0.0', '^19.0.0', true],
    ['19.0.0', '^18.0.0', false],
    // gte
    ['>=18', '19.0.0', true],
    ['>=18', '17.9.9', false],
    ['>=18', '>=20', true],
    // x-ranges
    ['19.x', '19.4.0', true],
    ['19.x', '20.0.0', false],
    ['19.x', '19.x', true],
    ['*', '^1.0.0', true],
  ] as const)('%s vs %s -> %s', (a, b, expected) => {
    expect(rangesIntersect(a, b)).toBe(expected);
  });

  it.each([
    ['^15.x', '15.0.0'],
    ['15.0.0 || 16.0.0', '^15.0.0'],
    ['15.0.0 - 16.0.0', '^15.0.0'],
    ['>15', '15.0.0'],
  ])('returns null for unsupported syntax %s', (a, b) => {
    expect(rangesIntersect(a, b)).toBeNull();
  });
});
