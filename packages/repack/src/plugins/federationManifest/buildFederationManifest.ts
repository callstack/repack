import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { buildSharedEntries } from './shared.js';
import type {
  FederationManifest,
  FederationManifestExposeEntry,
  FederationManifestRemoteEntry,
  FederationNativeModule,
} from './types.js';

export interface BuildFederationManifestParams {
  /** `compiler.context`, used to resolve installed package versions. */
  context: string;
  /** Container name from the plugin config. */
  name: string;
  /** Normalized `shared` config handed to the inner MF plugin. */
  shared: unknown;
  /** Raw `remotes` config from the user. */
  remotes?: unknown;
  /** Raw `exposes` config from the user. */
  exposes?: unknown;
  /** Resolved remote entry filename, if the plugin computed one. */
  filename?: string;
  /** `output.publicPath` observed at emit time. */
  publicPath: string;
  /** Compiler name, used to narrow `reactNative.platforms` when known. */
  platform?: string;
  nativeModules: FederationNativeModule[];
  dynamicImportDetected: boolean;
  /** False when `nativeAnalysis: false` was configured. */
  nativeAnalysis: boolean;
  /** Set when the native scan failed and returned an empty list. */
  nativeAnalysisDegraded: boolean;
}

export function buildFederationManifest(
  params: BuildFederationManifestParams
): FederationManifest {
  const name = params.name || 'unknown';
  const hasExposes =
    !!params.exposes &&
    (Array.isArray(params.exposes)
      ? params.exposes.length > 0
      : Object.keys(params.exposes).length > 0);

  const dynamicImportNote =
    'A dynamic require was detected in the module graph, so nativeModules is not guaranteed to be exhaustive.';
  const degradedNote =
    'Native module detection failed; nativeModules is empty and must not be trusted.';
  const nativeAnalysisDisabledNote =
    'Native module analysis was disabled with nativeAnalysis: false; nativeModules is empty.';
  const note = params.nativeAnalysisDegraded
    ? degradedNote
    : !params.nativeAnalysis
      ? nativeAnalysisDisabledNote
      : params.dynamicImportDetected
        ? dynamicImportNote
        : undefined;

  return {
    manifestVersion: 1,
    id: name,
    name,
    metaData: {
      name,
      globalName: name,
      type: hasExposes ? 'remote' : 'host',
      buildInfo: {
        buildVersion: resolveBuildVersion(params.context),
        buildName: name,
      },
      ...(hasExposes || params.filename
        ? {
            remoteEntry: {
              name: params.filename ?? `${name}.container.bundle`,
              path: '',
              type: 'var',
            },
          }
        : {}),
      publicPath: params.publicPath,
    },
    shared: buildSharedEntries(params.shared, params.context),
    remotes: buildRemoteEntries(params.remotes),
    exposes: buildExposeEntries(name, params.exposes),
    reactNative: {
      version: resolveReactNativeVersion(params.context),
      platforms:
        params.platform === 'ios' || params.platform === 'android'
          ? [params.platform]
          : ['ios', 'android'],
      nativeModules: params.nativeModules,
      dynamicImportDetected: params.dynamicImportDetected,
      ...(note ? { note } : {}),
    },
  };
}

function buildRemoteEntries(remotes: unknown): FederationManifestRemoteEntry[] {
  const entries: FederationManifestRemoteEntry[] = [];

  const parseRemoteString = (value: string): FederationManifestRemoteEntry => {
    const atIndex = value.indexOf('@');
    // No `@`: the whole string is the container name (dynamic-style shorthand)
    if (atIndex <= 0) {
      return {
        federationContainerName: value,
        moduleName: value,
        alias: value,
        entry: 'dynamic',
      };
    }
    const containerName = value.slice(0, atIndex);
    let rest = value.slice(atIndex + 1);
    // `app1@app1@http://...` nests the module name before the entry
    let moduleName = containerName;
    if (!rest.startsWith('http') && rest.includes('@')) {
      const nested = rest.slice(0, rest.indexOf('@'));
      moduleName = nested || containerName;
      rest = rest.slice(rest.indexOf('@') + 1);
    }
    return {
      federationContainerName: containerName,
      moduleName,
      alias: containerName,
      entry: rest,
    };
  };

  const visit = (remote: unknown) => {
    if (typeof remote === 'string') {
      entries.push(parseRemoteString(remote));
    } else if (Array.isArray(remote)) {
      remote.forEach(visit);
    } else if (typeof remote === 'object' && remote !== null) {
      const obj = remote as Record<string, unknown>;
      // V2 style: { name, alias, entry }
      if (typeof obj.entry === 'string' || typeof obj.name === 'string') {
        const containerName =
          typeof obj.name === 'string' ? obj.name : String(obj.alias ?? '');
        entries.push({
          federationContainerName: containerName,
          moduleName:
            typeof obj.moduleName === 'string' ? obj.moduleName : containerName,
          alias: typeof obj.alias === 'string' ? obj.alias : containerName,
          entry: typeof obj.entry === 'string' ? obj.entry : 'dynamic',
        });
        return;
      }
      // V1 style: { [key]: external | { external } }, keyed maps reach this
      // branch through the object loop below
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' || Array.isArray(value)) {
          entries.push(
            withAliasFromKey(parseRemoteStringInner(key, value), key)
          );
        } else if (typeof value === 'object' && value !== null) {
          const nested = value as Record<string, unknown>;
          const external = nested.external;
          const parsed =
            typeof external === 'string'
              ? parseRemoteStringInner(key, external)
              : {
                  federationContainerName: key,
                  moduleName: key,
                  alias: key,
                  entry: 'dynamic',
                };
          entries.push(withAliasFromKey(parsed, key));
        }
      }
    }
  };

  const parseRemoteStringInner = (
    key: string,
    value: unknown
  ): FederationManifestRemoteEntry => {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') {
      const parsed = parseRemoteString(first);
      return {
        ...parsed,
        federationContainerName: parsed.federationContainerName || key,
      };
    }
    return {
      federationContainerName: key,
      moduleName: key,
      alias: key,
      entry: 'dynamic',
    };
  };

  const withAliasFromKey = (
    entry: FederationManifestRemoteEntry,
    key: string
  ): FederationManifestRemoteEntry => ({
    ...entry,
    alias: key,
  });

  visit(remotes);
  return entries;
}

function buildExposeEntries(
  name: string,
  exposes: unknown
): FederationManifestExposeEntry[] {
  const keys: string[] = Array.isArray(exposes)
    ? exposes.filter((key): key is string => typeof key === 'string')
    : Object.keys((exposes as Record<string, unknown>) ?? {});

  return keys.map((key) => ({
    id: `${name}:${key.replace(/^\.\//, '')}`,
    name: key.replace(/^\.\//, ''),
    path: key,
  }));
}

function resolveBuildVersion(context: string): string {
  try {
    const git = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: context,
      encoding: 'utf-8',
      timeout: 5000,
    });
    const sha = git.status === 0 ? git.stdout.trim() : '';
    if (sha) return sha;
  } catch {
    // git unavailable or context is not a repo
  }
  try {
    const parsed = JSON.parse(
      fs.readFileSync(path.join(context, 'package.json'), 'utf-8')
    ) as { version?: string };
    if (parsed.version) return parsed.version;
  } catch {
    // no readable package.json
  }
  return 'unknown';
}

function resolveReactNativeVersion(context: string): string {
  try {
    const requireFromContext = createRequire(
      path.join(context, 'federation-manifest-resolver.js')
    );
    const pkgJsonPath = requireFromContext.resolve('react-native/package.json');
    const parsed = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as {
      version?: string;
    };
    return parsed.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
