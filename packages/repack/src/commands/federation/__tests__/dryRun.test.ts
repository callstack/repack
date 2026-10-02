import path from 'node:path';
import type { FederationManifestSharedEntry } from '../../../plugins/federationManifest/types.js';
import { resolveFederationWorkspace } from '../configFile.js';
import { doctorExitCode } from '../doctor.js';
import {
  collectDryRunInput,
  type DryRunApp,
  runDryRun,
  UNBUILT_CAVEAT,
} from '../dryRun.js';
import { extractAppShared } from '../extractShared.js';

// collectDryRunInput evaluates real user configs in-process; these tests
// pin WHICH config each app is routed to, so the extractor is a spy over an
// inert result (requireActual keeps ConfigEvalError for the import).
jest.mock('../extractShared.js', () => ({
  ...jest.requireActual('../extractShared.js'),
  extractAppShared: jest.fn(async (_root: string) => ({
    name: 'stub',
    pluginName: 'Stub',
    shared: [],
  })),
}));

const sharedEntry = (
  name: string,
  version: string,
  overrides: Partial<FederationManifestSharedEntry> = {}
): FederationManifestSharedEntry => ({
  name,
  version,
  singleton: true,
  eager: true,
  requiredVersion: version,
  ...overrides,
});

const app = (
  name: string,
  shared: FederationManifestSharedEntry[],
  dependencies: Record<string, string> = {}
): DryRunApp => ({
  name,
  root: `/workspace/apps/${name}`,
  packageJson: { name, dependencies },
  shared,
});

describe('runDryRun', () => {
  it('reports singleton version drift naming both versions, as an error', () => {
    const report = runDryRun({
      host: app('shell', [sharedEntry('react', '19.2.3')], { react: '19.2.3' }),
      remotes: [
        app('store', [sharedEntry('react', '19.1.0')], { react: '19.1.0' }),
      ],
    });

    const drift = report.findings.filter(
      (finding) => finding.code === 'SHARED_VERSION_DRIFT'
    );
    expect(drift).toHaveLength(1);
    expect(drift[0]!.severity).toBe('error');
    expect(drift[0]!.message).toContain('19.2.3');
    expect(drift[0]!.message).toContain('19.1.0');
    // The exit-code contract is the shared one: an error means exit 1.
    expect(doctorExitCode(report)).toBe(1);
  });

  it('carries the unbuilt caveat in EVERY finding message', () => {
    const report = runDryRun({
      host: app('shell', [sharedEntry('react', '19.2.3')], { react: '19.2.3' }),
      remotes: [
        app('store', [sharedEntry('react', '19.1.0')], {
          react: '19.1.0',
          '@acme/feature-lib': '2.0.0',
        }),
      ],
    });

    // Non-empty first: this scenario must produce drift AND missing-provider
    // findings, and each one must tell the user it is pre-build derived.
    expect(report.findings.length).toBeGreaterThan(1);
    for (const finding of report.findings) {
      expect(finding.message).toContain(UNBUILT_CAVEAT);
    }
  });

  it('degrades an unresolvable installed version to VERSION_UNKNOWN info', () => {
    const report = runDryRun({
      host: app('shell', [sharedEntry('react', 'unknown')], { react: '*' }),
      remotes: [
        app('store', [sharedEntry('react', '19.1.0')], { react: '19.1.0' }),
      ],
    });

    const unknown = report.findings.filter(
      (finding) => finding.code === 'VERSION_UNKNOWN'
    );
    expect(unknown).toHaveLength(1);
    expect(unknown[0]!.severity).toBe('info');
    expect(doctorExitCode(report)).toBe(0);
  });

  it('warns when a both-declared library is missing from the host shared provides', () => {
    const report = runDryRun({
      host: app('shell', [sharedEntry('react', '19.2.3')], {
        react: '19.2.3',
        '@acme/feature-lib': '2.0.0',
      }),
      remotes: [
        app('store', [sharedEntry('react', '19.2.3')], {
          react: '19.2.3',
          '@acme/feature-lib': '2.0.0',
        }),
      ],
    });

    const missing = report.findings.filter(
      (finding) => finding.code === 'MISSING_SHARED_PROVIDER'
    );
    expect(missing).toHaveLength(1);
    // Heuristic (both-declared) — warning severity, never an error.
    expect(missing[0]!.severity).toBe('warning');
    expect(missing[0]!.message).toContain('@acme/feature-lib');
    expect(missing[0]!.message).toContain('store');
    expect(doctorExitCode(report)).toBe(0);
  });

  it('only flags libraries BOTH apps declare (intersection heuristic)', () => {
    const report = runDryRun({
      host: app('shell', [sharedEntry('react', '19.2.3')], { react: '19.2.3' }),
      remotes: [
        app('store', [sharedEntry('react', '19.2.3')], {
          react: '19.2.3',
          'remote-only-lib': '1.0.0',
        }),
      ],
    });

    expect(
      report.findings.filter(
        (finding) => finding.code === 'MISSING_SHARED_PROVIDER'
      )
    ).toEqual([]);
  });

  it('produces no findings on a fully aligned, fully provisioned workspace', () => {
    const report = runDryRun({
      host: app('shell', [sharedEntry('react', '19.2.3')], { react: '19.2.3' }),
      remotes: [
        app('store', [sharedEntry('react', '19.2.3')], { react: '19.2.3' }),
      ],
    });

    // Why empty: same installed version, same flags, and every expected lib
    // (just react) is provided by the host — nothing left to report.
    expect(report.findings).toEqual([]);
    expect(doctorExitCode(report)).toBe(0);
  });

  it('never produces manifest-backed findings — dry-run does not consult manifests', () => {
    const report = runDryRun({
      host: app('shell', [sharedEntry('react', '19.2.3')], { react: '19.2.3' }),
      remotes: [
        // A remote that has never been built has no manifest at all; the
        // DryRunApp carries none and no MISSING_REMOTE_MANIFEST may appear.
        app('never-built', [sharedEntry('react', '19.2.3')], {
          react: '19.2.3',
        }),
      ],
    });

    expect(report.findings.map((finding) => finding.code)).not.toContain(
      'MISSING_REMOTE_MANIFEST'
    );
  });
});

describe('collectDryRunInput config pass-through', () => {
  const extractMock = jest.mocked(extractAppShared);
  const FIXTURES = path.join(__dirname, '__fixtures__');

  it('routes each declared config as configPath into extractAppShared', async () => {
    // Delta spec "Twin-app shared-root layout attributes correctly" at the
    // routing level: both twins share root "." and their config NAMES match
    // no discovery rule — only the declared config fields can attribute
    // them, so each app must reach the extractor with its own configPath.
    const twinDir = path.join(FIXTURES, 'config-dev-twin');
    const workspace = resolveFederationWorkspace(twinDir, {});

    await collectDryRunInput(twinDir, workspace);

    expect(extractMock).toHaveBeenCalledWith(twinDir, {
      configPath: path.join(twinDir, 'config.host-app.mts'),
    });
    expect(extractMock).toHaveBeenCalledWith(twinDir, {
      configPath: path.join(twinDir, 'config.mini-app.mts'),
    });
    expect(extractMock).toHaveBeenCalledTimes(2);
  });

  it('calls without configPath when no config fields are declared', async () => {
    // Delta spec "Pass-through is additive only": apps without `config`
    // keep today's call shape — discovery stays exactly as shipped.
    const workspaceDir = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'dry-run-workspace',
      'clean'
    );
    const workspace = resolveFederationWorkspace(workspaceDir, {});

    await collectDryRunInput(workspaceDir, workspace);

    expect(extractMock).toHaveBeenCalledTimes(2);
    for (const call of extractMock.mock.calls) {
      // Today's call shape carries no configPath value at all.
      expect(call[1] ?? {}).not.toHaveProperty('configPath');
    }
  });
});
