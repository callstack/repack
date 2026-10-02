import fs from 'node:fs';
import path from 'node:path';
import type {
  FederationManifest,
  FederationManifestSharedEntry,
} from '../../plugins/federationManifest/types.js';
import type {
  ResolvedEntry,
  ResolvedRemote,
  ResolvedWorkspace,
} from './configFile.js';
import {
  checkSharedDeps,
  type DoctorFinding,
  type DoctorReport,
} from './doctor.js';
import { ConfigEvalError, extractAppShared } from './extractShared.js';

/**
 * Suffix appended to every dry-run finding message: the check ran before any
 * build, so nothing here is backed by a built manifest. It rides inside
 * `message` so the locked `--format json` shape survives untouched.
 */
export const UNBUILT_CAVEAT =
  ' [dry-run: derived from package.json and bundler configs before any ' +
  'build; not verified against built manifests]';

/** The `package.json` fields the dry-run reads. */
export interface DryRunPackageJson {
  name?: string;
  dependencies?: Record<string, string>;
}

/** One app as the pre-build checks see it — no manifest anywhere. */
export interface DryRunApp {
  name: string;
  root: string;
  packageJson: DryRunPackageJson;
  /** Virtual manifest entries extracted from the app's bundler config. */
  shared: FederationManifestSharedEntry[];
}

export interface DryRunInput {
  host: DryRunApp;
  remotes: DryRunApp[];
}

/**
 * `checkSharedDeps` reads only the `shared` block; virtual entries derived
 * from configs are manifest-shaped exactly where it matters.
 */
function asManifestLike(app: DryRunApp): FederationManifest {
  return { shared: app.shared } as unknown as FederationManifest;
}

/**
 * Run the pre-build checks: shared-dependency version alignment over the
 * virtual entries (reusing the post-build `checkSharedDeps` codes and
 * severities verbatim) and expected-library coverage from the both-declared
 * heuristic. No builds, no app runs, no manifest fetches — and therefore no
 * `MISSING_REMOTE_MANIFEST` findings either.
 */
export function runDryRun(input: DryRunInput): DoctorReport {
  const findings: DoctorFinding[] = [];
  const hostProvides = new Set(input.host.shared.map((entry) => entry.name));
  const hostDependencies = input.host.packageJson.dependencies ?? {};

  for (const remote of input.remotes) {
    checkSharedDeps(
      asManifestLike(input.host),
      `host "${input.host.name}"`,
      asManifestLike(remote),
      `remote "${remote.name}"`,
      findings,
      'host-remote'
    );

    // Expected-libs coverage: a library BOTH apps declare is the
    // share-by-convention signal (federation-init writes scanned deps into
    // the remote's package.json, feeding this derivation). Heuristic, so
    // warning severity — a pre-build gate that cries error on guesses gets
    // disabled.
    for (const library of Object.keys(remote.packageJson.dependencies ?? {})) {
      if (!(library in hostDependencies) || hostProvides.has(library)) {
        continue;
      }
      findings.push({
        severity: 'warning',
        code: 'MISSING_SHARED_PROVIDER',
        message:
          `Library "${library}" is declared in the package.json of both ` +
          `host "${input.host.name}" and remote "${remote.name}", so the ` +
          'remote is expected to receive it as a shared dependency, but the ' +
          "host's shared configuration does not provide it; add it to the " +
          "host's shared list or remove it from one app's dependencies.",
      });
    }
  }

  return {
    findings: findings.map((finding) => ({
      ...finding,
      message: `${finding.message}${UNBUILT_CAVEAT}`,
    })),
  };
}

/** Read the app package.json the expected-libs check derives from. */
export function readDryRunPackageJson(root: string): DryRunPackageJson {
  const file = path.join(root, 'package.json');
  if (!fs.existsSync(file)) {
    throw new ConfigEvalError(
      `App package.json is missing: ${file} — the dry-run derives its ` +
        'inputs from package.json and bundler configs.'
    );
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as DryRunPackageJson;
  } catch {
    throw new ConfigEvalError(`App package.json is not valid JSON: ${file}`);
  }
}

/**
 * Build the pure `runDryRun` input from a resolved workspace: per app, the
 * root defaults to the config file's directory, the shared entries come from
 * evaluating the app's bundler config, and remotes keep their declared
 * names as finding labels.
 */
export async function collectDryRunInput(
  cwd: string,
  workspace: ResolvedWorkspace
): Promise<DryRunInput> {
  const baseDir = workspace.configPath
    ? path.dirname(workspace.configPath)
    : cwd;

  const toApp = async (
    entry: ResolvedEntry | ResolvedRemote,
    declaredName?: string
  ): Promise<DryRunApp> => {
    const root = entry.root ?? baseDir;
    const extracted = await extractAppShared(root);
    return {
      name: declaredName ?? extracted.name,
      root,
      packageJson: readDryRunPackageJson(root),
      shared: extracted.shared,
    };
  };

  const host = await toApp(workspace.host!);
  const remotes: DryRunApp[] = [];
  // Sequential on purpose: extraction evaluates user configs in-process and
  // the first failure aborts the run — order decides which one is reported.
  for (const remote of workspace.remotes) {
    remotes.push(await toApp(remote, remote.name));
  }

  return { host, remotes };
}
