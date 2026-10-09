import path from 'node:path';
import {
  type DoctorRemoteInput,
  doctorExitCode,
  doctorReportToJson,
  formatDoctorReport,
  runDoctor,
} from './federation/doctor.js';
import {
  type LoadedManifest,
  loadManifest,
  ManifestInvalidError,
  ManifestNotFoundError,
} from './federation/loadManifest.js';
import type { CliConfig, FederationDoctorArguments } from './types.js';

/** Split `--remotes` into sources, tolerating a merged array from the CLI. */
function parseRemoteList(remotes: string | string[] | undefined): string[] {
  if (!remotes) return [];
  const values = Array.isArray(remotes) ? remotes : [remotes];
  return values.flatMap((value) =>
    value
      .split(',')
      .map((source) => source.trim())
      .filter(Boolean)
  );
}

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
  if (!args.host) {
    console.error(
      "Option '--host <source>' is required: pass the host manifest as a " +
        '.json file, a build output directory, or an http(s) URL.'
    );
    process.exit(2);
    return;
  }

  const remoteSources = parseRemoteList(args.remotes);
  if (remoteSources.length === 0) {
    console.error(
      "Option '--remotes <list>' is required: pass a comma-separated list " +
        'of remote manifest sources.'
    );
    process.exit(2);
    return;
  }

  let host: LoadedManifest;
  try {
    host = await loadManifest(args.host);
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
  for (const source of remoteSources) {
    try {
      const remote = await loadManifest(source);
      remotes.push({
        name:
          remote.manifest.name || remote.manifest.id || labelFromSource(source),
        manifest: remote.manifest,
      });
    } catch (error) {
      if (error instanceof ManifestNotFoundError) {
        remotes.push({ name: labelFromSource(source), missing: true });
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
  });

  if (args.format === 'json') {
    console.log(doctorReportToJson(report));
  } else {
    console.log(formatDoctorReport(report));
  }

  process.exit(doctorExitCode(report));
}
