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
}

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

function checkSharedDeps(
  host: FederationManifest,
  remoteName: string,
  remote: FederationManifest,
  findings: DoctorFinding[]
): void {
  const remoteShared = new Map(
    sharedOf(remote).map((entry) => [entry.name, entry])
  );

  for (const hostEntry of sharedOf(host)) {
    const remoteEntry = remoteShared.get(hostEntry.name);
    if (!remoteEntry) continue;
    const name = hostEntry.name;

    if (hostEntry.singleton !== remoteEntry.singleton) {
      findings.push({
        severity: 'error',
        code: 'SINGLETON_MISMATCH',
        message: `Shared dependency "${name}" is singleton: ${hostEntry.singleton} on host "${host.name}" but ${remoteEntry.singleton} on remote "${remoteName}".`,
      });
    }
    if (hostEntry.eager !== remoteEntry.eager) {
      const conventional = hostEntry.eager && !remoteEntry.eager; // host-eager / remote-lazy = MF convention
      findings.push({
        severity: conventional ? 'warning' : 'error',
        code: conventional ? 'EAGER_ADVISORY' : 'EAGER_MISMATCH',
        message: conventional
          ? `Shared dependency "${name}" is eager: true on host "${host.name}" but eager: false on remote "${remoteName}" — expected host-eager/remote-lazy convention; reported as advisory.`
          : `Shared dependency "${name}" is eager: ${hostEntry.eager} on host "${host.name}" but ${remoteEntry.eager} on remote "${remoteName}".`,
      });
    }

    const bothSingleton = hostEntry.singleton && remoteEntry.singleton;
    if (bothSingleton && hostEntry.version !== remoteEntry.version) {
      if (
        hostEntry.version === 'unknown' ||
        remoteEntry.version === 'unknown'
      ) {
        findings.push({
          severity: 'info',
          code: 'VERSION_UNKNOWN',
          message: `Shared dependency "${name}" is a singleton but its resolved version could not be determined on at least one side (host: ${hostEntry.version}, remote "${remoteName}": ${remoteEntry.version}); verify they match manually.`,
        });
      } else {
        findings.push({
          severity: 'error',
          code: 'SHARED_VERSION_DRIFT',
          message: `Singleton shared dependency "${name}" resolves to different versions: host "${host.name}" has ${hostEntry.version}, remote "${remoteName}" has ${remoteEntry.version}. Align the versions (or remove singleton).`,
        });
      }
    }

    const verdict = rangesIntersect(
      hostEntry.requiredVersion,
      remoteEntry.requiredVersion
    );
    if (verdict === false) {
      findings.push({
        severity: 'warning',
        code: 'SHARED_RANGE_UNRESOLVABLE',
        message: `Shared dependency "${name}" declares ranges that cannot intersect: host "${host.name}" requires ${hostEntry.requiredVersion}, remote "${remoteName}" requires ${remoteEntry.requiredVersion}.`,
      });
    } else if (verdict === null) {
      findings.push({
        severity: 'warning',
        code: 'SHARED_RANGE_UNSUPPORTED',
        message: `Shared dependency "${name}" uses a requiredVersion this doctor cannot evaluate (host: ${hostEntry.requiredVersion}, remote "${remoteName}": ${remoteEntry.requiredVersion}); check compatibility manually.`,
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
  const findings: DoctorFinding[] = [];

  checkManifestVersion(input.host, `Host "${input.host.name}"`, findings);
  for (const remote of input.remotes) {
    if (remote.missing || !remote.manifest) {
      continue;
    }
    checkManifestVersion(remote.manifest, `Remote "${remote.name}"`, findings);
    checkSharedDeps(input.host, remote.name, remote.manifest, findings);
    checkNativeModules(input.host, remote.name, remote.manifest, findings);
  }
  checkRemoteManifests(input, findings);

  return { findings };
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
