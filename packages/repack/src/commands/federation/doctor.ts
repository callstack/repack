import type {
  FederationManifest,
  FederationManifestSharedEntry,
  FederationNativeModule,
} from '../../plugins/federationManifest/types.js';
import { rangesIntersect } from './semverRange.js';

/** The highest manifest schema version this doctor understands. */
const SUPPORTED_MANIFEST_VERSION = 1;

/** One problem (or advisory) found while comparing manifests. */
export interface DoctorFinding {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

/** Result of a doctor run; the caller maps it to a process exit code. */
export interface DoctorReport {
  findings: DoctorFinding[];
}

/** A remote to compare against the host. */
export interface DoctorRemoteInput {
  /** Name used to refer to the remote in findings. */
  name: string;
  /** Its manifest, when available. */
  manifest?: FederationManifest;
  /** True when no manifest could be obtained for this remote. */
  missing?: boolean;
}

export interface DoctorInput {
  host: FederationManifest;
  remotes: DoctorRemoteInput[];
  /** Downgrade missing-remote findings from error to warning. */
  allowMissingManifests?: boolean;
  /** Also compare every remote pair, shared-dependency checks only. */
  pairwise?: boolean;
}

/** Which sides a shared-dependency comparison runs between. */
export type DoctorPairKind = 'host-remote' | 'remote-remote';

function sharedOf(
  manifest: FederationManifest
): FederationManifestSharedEntry[] {
  return Array.isArray(manifest?.shared) ? manifest.shared : [];
}

function nativeModulesOf(
  manifest: FederationManifest
): FederationNativeModule[] {
  const modules = manifest?.reactNative?.nativeModules;
  return Array.isArray(modules) ? modules : [];
}

/**
 * A host native-module list is only authoritative when nothing was detected
 * heuristically and no dynamic require was seen in the module graph.
 */
function hostNativeListIsTrusted(host: FederationManifest): boolean {
  const native = host?.reactNative;
  if (!native || native.dynamicImportDetected) return false;
  return !nativeModulesOf(host).some(
    (entry) => entry.confidence === 'heuristic'
  );
}

function checkManifestVersion(
  manifest: FederationManifest,
  label: string,
  findings: DoctorFinding[]
): void {
  const version = manifest?.manifestVersion;
  if (typeof version === 'number' && version > SUPPORTED_MANIFEST_VERSION) {
    findings.push({
      severity: 'warning',
      code: 'MANIFEST_VERSION_AHEAD',
      message: `${label} declares manifestVersion ${version}, newer than the v1 schema this doctor understands; comparing best effort.`,
    });
  }
}

/**
 * Compare the shared-dependency blocks of two apps. Labels are preformatted
 * (`host "shell"`, `remote "store"`) so host↔remote messages keep byte-stable
 * text; `pairKind` selects the eager policy: host↔remote applies the
 * host-eager/remote-lazy convention, remote↔remote reports any mismatch as an
 * advisory — no convention orders two remotes (the host arbitrates their
 * shares).
 *
 * Exported for `dryRun.ts`, which feeds it manifest-shaped virtual entries
 * derived from bundler configs instead of built manifests.
 */
export function checkSharedDeps(
  left: FederationManifest,
  leftLabel: string,
  right: FederationManifest,
  rightLabel: string,
  findings: DoctorFinding[],
  pairKind: DoctorPairKind
): void {
  const rightShared = new Map(
    sharedOf(right).map((entry) => [entry.name, entry])
  );

  for (const leftEntry of sharedOf(left)) {
    const rightEntry = rightShared.get(leftEntry.name);
    if (!rightEntry) continue;
    const name = leftEntry.name;

    if (leftEntry.singleton !== rightEntry.singleton) {
      findings.push({
        severity: 'error',
        code: 'SINGLETON_MISMATCH',
        message: `Shared dependency "${name}" is singleton: ${leftEntry.singleton} on ${leftLabel} but ${rightEntry.singleton} on ${rightLabel}.`,
      });
    }
    if (leftEntry.eager !== rightEntry.eager) {
      const conventional =
        pairKind === 'host-remote' && leftEntry.eager && !rightEntry.eager; // host-eager / remote-lazy = MF convention
      const crossRemote = pairKind === 'remote-remote';
      findings.push({
        severity: conventional || crossRemote ? 'warning' : 'error',
        code: conventional || crossRemote ? 'EAGER_ADVISORY' : 'EAGER_MISMATCH',
        message: conventional
          ? `Shared dependency "${name}" is eager: true on ${leftLabel} but eager: false on ${rightLabel} — expected host-eager/remote-lazy convention; reported as advisory.`
          : crossRemote
            ? `Shared dependency "${name}" is eager: ${leftEntry.eager} on ${leftLabel} but ${rightEntry.eager} on ${rightLabel} — no convention orders two remotes; reported as advisory.`
            : `Shared dependency "${name}" is eager: ${leftEntry.eager} on ${leftLabel} but ${rightEntry.eager} on ${rightLabel}.`,
      });
    }

    const bothSingleton = leftEntry.singleton && rightEntry.singleton;
    if (bothSingleton && leftEntry.version !== rightEntry.version) {
      if (leftEntry.version === 'unknown' || rightEntry.version === 'unknown') {
        findings.push({
          severity: 'info',
          code: 'VERSION_UNKNOWN',
          message: `Shared dependency "${name}" is a singleton but its resolved version could not be determined on at least one side (${leftLabel}: ${leftEntry.version}, ${rightLabel}: ${rightEntry.version}); verify they match manually.`,
        });
      } else {
        findings.push({
          severity: 'error',
          code: 'SHARED_VERSION_DRIFT',
          message: `Singleton shared dependency "${name}" resolves to different versions: ${leftLabel} has ${leftEntry.version}, ${rightLabel} has ${rightEntry.version}. Align the versions (or remove singleton).`,
        });
      }
    }

    const verdict = rangesIntersect(
      leftEntry.requiredVersion,
      rightEntry.requiredVersion
    );
    if (verdict === false) {
      findings.push({
        severity: 'warning',
        code: 'SHARED_RANGE_UNRESOLVABLE',
        message: `Shared dependency "${name}" declares ranges that cannot intersect: ${leftLabel} requires ${leftEntry.requiredVersion}, ${rightLabel} requires ${rightEntry.requiredVersion}.`,
      });
    } else if (verdict === null) {
      findings.push({
        severity: 'warning',
        code: 'SHARED_RANGE_UNSUPPORTED',
        message: `Shared dependency "${name}" uses a requiredVersion this doctor cannot evaluate (${leftLabel}: ${leftEntry.requiredVersion}, ${rightLabel}: ${rightEntry.requiredVersion}); check compatibility manually.`,
      });
    }
  }
}

function checkNativeModules(
  host: FederationManifest,
  remoteName: string,
  remote: FederationManifest,
  findings: DoctorFinding[]
): void {
  const hostPackages = new Set(
    nativeModulesOf(host).map((entry) => entry.package)
  );
  const trusted = hostNativeListIsTrusted(host);

  for (const entry of nativeModulesOf(remote)) {
    if (hostPackages.has(entry.package)) continue;
    if (!trusted) {
      findings.push({
        severity: 'warning',
        code: 'HEURISTIC_ADVISORY',
        message:
          `Native module "${entry.package}" (${entry.version}) used by remote "${remoteName}" is not in host "${host.name}" nativeModules, ` +
          'but the host list is heuristic or incomplete (dynamic imports were detected); verify manually.',
      });
      continue;
    }
    findings.push({
      severity: 'error',
      code: 'MISSING_NATIVE_MODULE',
      message:
        `Native module "${entry.package}" (${entry.version}) used by remote "${remoteName}" is not listed in host "${host.name}" reactNative.nativeModules. ` +
        'If the host provides this module from its app project rather than node_modules, verify manually.',
    });
  }
}

function checkRemoteManifests(
  input: DoctorInput,
  findings: DoctorFinding[]
): void {
  for (const remote of input.remotes) {
    if (!remote.missing) continue;
    findings.push({
      severity: input.allowMissingManifests ? 'warning' : 'error',
      code: 'MISSING_REMOTE_MANIFEST',
      message:
        `Remote "${remote.name}" has no federation manifest, so it was not checked. ` +
        'Enable `manifest: true` in its ModuleFederationPlugin config and redeploy it, or pass a local manifest file for it.',
    });
  }
}

/**
 * Compare a host manifest against a set of remote manifests and report every
 * shared-dependency and native-module inconsistency found.
 */
export function runDoctor(input: DoctorInput): DoctorReport {
  // Three buckets, emitted native → shared → meta once EVERY comparison has
  // run: the report leads with the most fatal crash class, and one remote's
  // errors never suppress another remote's findings (no fail-fast). The
  // ordering is report-only; the severity-to-exit-code mapping is unchanged.
  const native: DoctorFinding[] = [];
  const shared: DoctorFinding[] = [];
  const meta: DoctorFinding[] = [];

  checkManifestVersion(input.host, `Host "${input.host.name}"`, meta);
  const compared: Array<{ name: string; manifest: FederationManifest }> = [];
  for (const remote of input.remotes) {
    if (remote.missing || !remote.manifest) {
      continue;
    }
    compared.push({ name: remote.name, manifest: remote.manifest });
    checkManifestVersion(remote.manifest, `Remote "${remote.name}"`, meta);
    checkSharedDeps(
      input.host,
      `host "${input.host.name}"`,
      remote.manifest,
      `remote "${remote.name}"`,
      shared,
      'host-remote'
    );
    // Native checks stay host↔remote only: native is directional and the
    // host is the provider, so remote↔remote pairs have nothing to compare.
    checkNativeModules(input.host, remote.name, remote.manifest, native);
  }

  if (input.pairwise) {
    // Opt-in, shared-only, every (remote_i, remote_j) with i < j — opt-in
    // keeps the O(n²) noise off anyone's default report.
    for (let i = 0; i < compared.length; i++) {
      for (let j = i + 1; j < compared.length; j++) {
        const left = compared[i]!;
        const right = compared[j]!;
        checkSharedDeps(
          left.manifest,
          `remote "${left.name}"`,
          right.manifest,
          `remote "${right.name}"`,
          shared,
          'remote-remote'
        );
      }
    }
  }

  checkRemoteManifests(input, meta);

  return { findings: [...native, ...shared, ...meta] };
}

/**
 * Map a doctor report to a process exit code: 1 when any error was found,
 * 0 otherwise. Exit code 2 is produced by the caller when a manifest fails
 * to load or parse (`ManifestNotFoundError` / `ManifestInvalidError`).
 */
export function doctorExitCode(report: DoctorReport): 0 | 1 | 2 {
  return report.findings.some((finding) => finding.severity === 'error')
    ? 1
    : 0;
}

function labelForSeverity(severity: DoctorFinding['severity']): string {
  return severity === 'error'
    ? 'error  '
    : severity === 'warning'
      ? 'warning'
      : 'info   ';
}

/**
 * Render a doctor report as aligned plain text.
 */
export function formatDoctorReport(report: DoctorReport): string {
  const errors = report.findings.filter((f) => f.severity === 'error').length;
  const warnings = report.findings.filter(
    (f) => f.severity === 'warning'
  ).length;
  const infos = report.findings.filter((f) => f.severity === 'info').length;

  if (report.findings.length === 0) return 'Doctor: no issues found.';

  const lines = [
    `Doctor: ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}, ${infos} info`,
    '',
  ];
  for (const finding of report.findings) {
    lines.push(
      `${labelForSeverity(finding.severity)}  ${finding.code}  ${finding.message}`
    );
  }
  return lines.join('\n');
}

/**
 * Serialize a doctor report as JSON with a stable key order.
 */
export function doctorReportToJson(report: DoctorReport): string {
  return JSON.stringify(
    {
      findings: report.findings.map((finding) => ({
        severity: finding.severity,
        code: finding.code,
        message: finding.message,
      })),
    },
    null,
    2
  );
}
