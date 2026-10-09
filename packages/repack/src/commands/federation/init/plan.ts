import fs from 'node:fs';
import path from 'node:path';
import { resolveInstalledVersion } from '../../../utils/sharedVersionResolver.js';
import { formatFileDiff } from './diff.js';
import {
  ensureRemotesEntry,
  mergeFederationConfig,
  mergePackageJsonDeps,
  rewritePackageJsonDeps,
} from './merge.js';
import type { RemoteConfigTemplate } from './templates.js';
import { renderRemoteConfig, sharedDepsFromConfig } from './templates.js';

/** One planned file write. `before: null` means the file will be created. */
export interface InitPlanFile {
  path: string;
  before: string | null;
  after: string;
}

/** Host-vs-existing-remote installed-version divergence for one package. */
export interface InitDivergenceEntry {
  remote: string;
  pkg: string;
  hostVersion: string;
  remoteVersion: string;
}

/** One pin the align step rewrites, for old→new reports. */
export interface InitAlignEntry {
  remote: string;
  pkg: string;
  from: string;
  to: string;
}

export interface InitPlan {
  workspaceRoot: string;
  files: InitPlanFile[];
  manualSteps: string[];
  advisories: string[];
  divergence: InitDivergenceEntry[];
  alignment: InitAlignEntry[];
}

export interface InitPlanInput {
  workspaceRoot: string;
  remoteName: string;
  remoteRoot: string;
  featureFolder: string;
  hostRoot: string;
  hostConfigPath: string;
  /** Output of the feature-folder scanner. */
  scannedDependencies: string[];
  scannedAdvisories?: string[];
  /** Shared dependency names the host config provides (from extraction). */
  hostSharedProvides: string[];
  /** Mirrored from the host's evaluated plugin instance (D4). */
  pluginVersion: 'V1' | 'V2';
  /** Other remotes already in the workspace, for divergence checks. */
  existingRemotes?: Array<{ name: string; root: string }>;
  /** `--yes`: auto-align divergent remote pins to the host versions. */
  align?: boolean;
  /** Write `standalone: true` into the new workspace-map entry. */
  standalone?: boolean;
  /** Injected read — the plan performs no fs beyond reads; writes are apply's. */
  readFile?: (filePath: string) => string | null;
}

function defaultReadFile(filePath: string): string | null {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

function remoteRegistrationValue(remoteName: string): string {
  return `${remoteName}@${remoteName}/remoteEntry.js`;
}

/**
 * Compute everything `federation-init` would write, without writing it:
 * key-level merges over every surface, create-only remote configs, anchored
 * host surgery with manual-steps degradation, divergence data and the
 * optional align rewrites. The plan carries full before/after content, which
 * is what makes the diff-before-write gate possible.
 */
export function computeInitPlan(input: InitPlanInput): InitPlan {
  const read = input.readFile ?? defaultReadFile;
  const files: InitPlanFile[] = [];
  const manualSteps: string[] = [];
  const advisories: string[] = [...(input.scannedAdvisories ?? [])];
  const divergence: InitDivergenceEntry[] = [];
  const alignment: InitAlignEntry[] = [];

  // 1. Dependency set: scan ∩ host shared provides, at host versions.
  const provides = new Set(input.hostSharedProvides);
  const sharedDeps = input.scannedDependencies.filter((dep) =>
    provides.has(dep)
  );
  const hostPackageJson = readJson(
    path.join(input.hostRoot, 'package.json'),
    read
  );
  const declaredHostDeps = (hostPackageJson?.dependencies ?? {}) as Record<
    string,
    string
  >;
  const depVersions: Record<string, string> = {};
  for (const dep of sharedDeps) {
    let version = resolveInstalledVersion(dep, input.hostRoot);
    if (version === 'unknown') {
      // Installed pin wins; the host's declared version is the fallback.
      version = declaredHostDeps[dep] ?? 'unknown';
    }
    if (version === 'unknown') {
      advisories.push(
        `Shared dependency "${dep}" has no installed or host-declared version — omitted from the generated package.json; add it manually if the remote needs it.`
      );
      continue;
    }
    depVersions[dep] = version;
  }
  for (const dep of input.scannedDependencies) {
    if (!provides.has(dep)) {
      advisories.push(
        `Scanned dependency "${dep}" is not shared by the host — add it to the remote package.json yourself if the remote needs it.`
      );
    }
  }

  // 2. Remote package.json: key-level dep merge (create when absent).
  const remotePkgPath = path.join(input.remoteRoot, 'package.json');
  const remotePkgSource = read(remotePkgPath);
  const pkgMerge = mergePackageJsonDeps(
    remotePkgSource,
    path.basename(input.remoteRoot),
    depVersions
  );
  if (pkgMerge.added.length > 0) {
    files.push({
      path: remotePkgPath,
      before: remotePkgSource,
      after: pkgMerge.after,
    });
  }

  // 3. Remote bundler configs: create-only, both bundlers, versionless.
  const featureRelRaw = toPosix(
    path.relative(input.remoteRoot, input.featureFolder)
  );
  const featureFolderRel = featureRelRaw.startsWith('..')
    ? featureRelRaw
    : `./${featureRelRaw}`;
  for (const bundler of ['rspack', 'webpack'] as const) {
    const configPath = path.join(
      input.remoteRoot,
      `${bundler}.${input.remoteName}.mts`
    );
    const existing = read(configPath);
    if (existing === null) {
      const template: RemoteConfigTemplate = {
        bundler,
        remoteName: input.remoteName,
        featureFolderRel,
        sharedDeps,
        pluginVersion: input.pluginVersion,
      };
      files.push({
        path: configPath,
        before: null,
        after: renderRemoteConfig(template),
      });
    } else {
      // Existing config (generated or hand-written): never rewrite — advise
      // about scanned deps its shared list does not carry.
      const listed = sharedDepsFromConfig(existing);
      if (listed === null) {
        advisories.push(
          `${path.basename(configPath)} already exists and carries no federation-init markers — it is left untouched; make sure its shared setup covers: ${sharedDeps.join(', ')}.`
        );
      } else {
        const missing = sharedDeps.filter((dep) => !listed.includes(dep));
        if (missing.length > 0) {
          advisories.push(
            `${path.basename(configPath)} is missing shared deps from the latest scan: ${missing.join(', ')} — add them to its SHARED_DEPS list yourself.`
          );
        }
      }
    }
  }

  // 4. Host surgery: anchored remotes registration, manual-steps degradation.
  const hostSource = read(input.hostConfigPath);
  if (hostSource === null) {
    manualSteps.push(
      `No host bundler configuration found at ${input.hostConfigPath} — register remote "${input.remoteName}" ('${remoteRegistrationValue(input.remoteName)}') in the host Module Federation plugin yourself.`
    );
  } else {
    const surgery = ensureRemotesEntry(
      hostSource,
      input.remoteName,
      remoteRegistrationValue(input.remoteName)
    );
    if (surgery.changed && surgery.after !== undefined) {
      files.push({
        path: input.hostConfigPath,
        before: hostSource,
        after: surgery.after,
      });
    } else if (surgery.manualStep) {
      manualSteps.push(surgery.manualStep);
    }
  }

  // 5. Workspace map: repack-federation.json remotes.<name> entry.
  const configPath = path.join(input.workspaceRoot, 'repack-federation.json');
  const configSource = read(configPath);
  const relativeRoot = toPosix(
    path.relative(input.workspaceRoot, input.remoteRoot)
  );
  const mapEntry: Record<string, unknown> = {
    manifest: `${relativeRoot}/build`,
    root: relativeRoot,
    ...(input.standalone === true ? { standalone: true } : {}),
  };
  const mapMerge = mergeFederationConfig(
    configSource,
    input.remoteName,
    mapEntry
  );
  if (mapMerge.changed && mapMerge.after !== undefined) {
    files.push({
      path: configPath,
      before: configSource,
      after: mapMerge.after,
    });
  }

  // 6. Divergence: host vs every existing remote, installed versions only.
  for (const remote of input.existingRemotes ?? []) {
    for (const dep of sharedDeps) {
      const hostVersion = resolveInstalledVersion(dep, input.hostRoot);
      const remoteVersion = resolveInstalledVersion(dep, remote.root);
      if (
        hostVersion !== 'unknown' &&
        remoteVersion !== 'unknown' &&
        hostVersion !== remoteVersion
      ) {
        divergence.push({
          remote: remote.name,
          pkg: dep,
          hostVersion,
          remoteVersion,
        });
      }
    }
  }

  // 7. Align (--yes): rewrite divergent remote pins to exact host versions.
  if (input.align === true) {
    const byRemote = new Map<string, Array<{ pkg: string; to: string }>>();
    for (const entry of divergence) {
      const list = byRemote.get(entry.remote) ?? [];
      list.push({ pkg: entry.pkg, to: entry.hostVersion });
      byRemote.set(entry.remote, list);
    }
    for (const remote of input.existingRemotes ?? []) {
      const rewrites = byRemote.get(remote.name);
      if (!rewrites || rewrites.length === 0) continue;
      const remoteManifestPath = path.join(remote.root, 'package.json');
      const source = read(remoteManifestPath);
      if (source === null) {
        manualSteps.push(
          `Remote "${remote.name}" has divergent shared versions but no package.json at ${remote.root} — align it manually.`
        );
        continue;
      }
      const deps: Record<string, string> = {};
      for (const r of rewrites) deps[r.pkg] = r.to;
      const rewritten = rewritePackageJsonDeps(source, deps);
      if (rewritten.changed) {
        files.push({
          path: remoteManifestPath,
          before: source,
          after: rewritten.after,
        });
      }
      for (const r of rewrites) {
        alignment.push({
          remote: remote.name,
          pkg: r.pkg,
          from: rewritten.previous[r.pkg] ?? 'unknown',
          to: r.to,
        });
      }
    }
  }

  return {
    workspaceRoot: input.workspaceRoot,
    files,
    manualSteps,
    advisories,
    divergence,
    alignment,
  };
}

function readJson(
  filePath: string,
  read: (p: string) => string | null
): Record<string, unknown> | null {
  const source = read(filePath);
  if (source === null) return null;
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Render the whole plan as the pre-confirm printout: diffs for every file
 * write, then manual steps, version divergence and advisories.
 */
export function formatPlanDiff(plan: InitPlan): string {
  const display = (filePath: string): string => {
    const rel = path.relative(plan.workspaceRoot, filePath);
    return !rel.startsWith('..') && !path.isAbsolute(rel)
      ? toPosix(rel)
      : filePath;
  };

  const sections: string[] = [];
  for (const file of plan.files) {
    sections.push(formatFileDiff(display(file.path), file.before, file.after));
  }
  if (plan.divergence.length > 0) {
    sections.push(
      `Shared version divergence (host vs existing remotes):\n${plan.divergence
        .map(
          (entry) =>
            `  ${entry.remote}: ${entry.pkg}: remote ${entry.remoteVersion} vs host ${entry.hostVersion}`
        )
        .join('\n')}`
    );
  }
  if (plan.manualSteps.length > 0) {
    sections.push(
      `Manual steps:\n${plan.manualSteps.map((step) => `  - ${step}`).join('\n')}`
    );
  }
  if (plan.advisories.length > 0) {
    sections.push(
      `Advisories:\n${plan.advisories.map((a) => `  - ${a}`).join('\n')}`
    );
  }
  return sections.join('\n\n');
}
