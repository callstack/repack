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
