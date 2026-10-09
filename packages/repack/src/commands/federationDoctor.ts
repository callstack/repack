import path from 'node:path';
import {
  ConfigFileInvalidError,
  resolveFederationWorkspace,
} from './federation/configFile.js';
import type { DoctorReport } from './federation/doctor.js';
import {
  type DoctorRemoteInput,
  doctorExitCode,
  doctorReportToJson,
  formatDoctorReport,
  runDoctor,
} from './federation/doctor.js';
import { collectDryRunInput, runDryRun } from './federation/dryRun.js';
import { ConfigEvalError } from './federation/extractShared.js';
import {
  type LoadedManifest,
  loadManifest,
  ManifestInvalidError,
  ManifestNotFoundError,
} from './federation/loadManifest.js';
import type { CliConfig, FederationDoctorArguments } from './types.js';

/** Best-effort label for a remote whose manifest could not be loaded. */
function labelFromSource(source: string): string {
  try {
    const pathname = new URL(source).pathname;
    return path.basename(pathname) || source;
  } catch {
    return path.basename(source) || source;
  }
}

/**
 * Compare a host federation manifest against a set of remotes and report
 * shared-dependency and native-module drift. Exit code 1 when any drift was
 * found, 2 when a manifest could not be loaded or parsed.
 *
 * @param _argv Original, non-parsed arguments.
 * @param _cliConfig Configuration object containing platform and project settings.
 * @param args Parsed command line arguments.
 */
export async function federationDoctor(
  _argv: string[],
  _cliConfig: CliConfig,
  args: FederationDoctorArguments
) {
  // Values come from flags first, then a discovered repack-federation.json,
  // then defaults; a malformed config file is exit 2 with a plain message.
  let workspace: ReturnType<typeof resolveFederationWorkspace>;
  try {
    workspace = resolveFederationWorkspace(process.cwd(), {
      host: args.host,
      remotes: args.remotes,
    });
  } catch (error) {
    if (error instanceof ConfigFileInvalidError) {
      console.error(
        `Federation config — ${error.filePath}: ${error.reasons.join('; ')}`
      );
      process.exit(2);
      return;
    }
    throw error;
  }

  if (!workspace.host) {
    console.error(
      "Option '--host <source>' is required: pass the host manifest as a " +
        '.json file, a build output directory, or an http(s) URL.'
    );
    process.exit(2);
    return;
  }

  if (workspace.remotes.length === 0) {
    console.error(
      "Option '--remotes <list>' is required: pass a comma-separated list " +
        'of remote manifest sources.'
    );
    process.exit(2);
    return;
  }

  if (args.dryRun) {
    // Pre-build mode: inputs come from package.json files and evaluated
    // bundler configs only — no builds, no app runs, no manifest fetches.
    // A config that cannot be evaluated is "could not run": exit 2, message
    // only, never a stack. Exit codes come from the shared contract.
    let report: DoctorReport;
    try {
      report = runDryRun(await collectDryRunInput(process.cwd(), workspace));
    } catch (error) {
      if (error instanceof ConfigEvalError) {
        console.error(`Federation dry-run — ${error.message}`);
        process.exit(2);
        return;
      }
      throw error;
    }

    if (args.format === 'json') {
      console.log(doctorReportToJson(report));
    } else {
      console.log(formatDoctorReport(report));
    }

    process.exit(doctorExitCode(report));
    return;
  }

  let host: LoadedManifest;
  try {
    host = await loadManifest(workspace.host.source);
  } catch (error) {
    if (
      error instanceof ManifestNotFoundError ||
      error instanceof ManifestInvalidError
    ) {
      console.error(`Host manifest — ${error.name}: ${error.message}`);
      process.exit(2);
      return;
    }
    throw error;
  }

  const remotes: DoctorRemoteInput[] = [];
  for (const remoteEntry of workspace.remotes) {
    const { source } = remoteEntry;
    try {
      const remote = await loadManifest(source);
      remotes.push({
        // Config-file remotes carry their declared name, which labels
        // findings better than any source-derived guess.
        name:
          remoteEntry.name ??
          remote.manifest.name ??
          remote.manifest.id ??
          labelFromSource(source),
        manifest: remote.manifest,
      });
    } catch (error) {
      if (error instanceof ManifestNotFoundError) {
        remotes.push({
          name: remoteEntry.name ?? labelFromSource(source),
          missing: true,
        });
        continue;
      }
      if (error instanceof ManifestInvalidError) {
        console.error(`Remote "${source}" — ${error.name}: ${error.message}`);
        console.error(
          'A corrupt remote manifest means its checks cannot be trusted; fix or remove it before running the doctor.'
        );
        process.exit(2);
        return;
      }
      throw error;
    }
  }

  const report = runDoctor({
    host: host.manifest,
    remotes,
    allowMissingManifests: args.allowMissingManifests,
    pairwise: args.pairwise,
  });

  if (args.format === 'json') {
    console.log(doctorReportToJson(report));
  } else {
    console.log(formatDoctorReport(report));
  }

  process.exit(doctorExitCode(report));
}
