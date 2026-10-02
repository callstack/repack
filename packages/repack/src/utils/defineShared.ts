import {
  normalizeSharedEntries,
  resolveInstalledVersion,
} from './sharedVersionResolver.js';

/**
 * Per-dependency configuration accepted inside any of the shapes
 * `defineShared` takes. Unknown keys are passed through verbatim to the
 * federation plugin `shared` option (`import`, `shareScope`, …).
 */
export interface SharedDepConfig {
  singleton?: boolean;
  eager?: boolean;
  [key: string]: unknown;
}

/**
 * All dependency shapes `normalizeSharedEntries` handles: a single package
 * name, an array of names / `{ [name]: config }` wrappers /
 * `{ name, ...config }` items, or a `{ [name]: config | string }` record.
 */
export type DefineSharedDeps =
  | string
  | Array<
      | string
      | Record<string, SharedDepConfig | string>
      | ({ name: string } & SharedDepConfig)
    >
  | Record<string, SharedDepConfig | string>;

export interface DefineSharedOptions {
  /** Directory version resolution starts from. Defaults to `process.cwd()`. */
  context?: string;
  /** Eager convention role. Defaults to `'host'`. */
  role?: 'host' | 'remote';
  /** Eager convention mode. Defaults to `'federated'`. */
  mode?: 'federated' | 'standalone';
}

/** One emitted shared entry: exact pins plus the merged user config. */
export interface SharedEntryOut {
  singleton: boolean;
  eager: boolean;
  /** Exact installed version pin — never a range or committed literal. */
  version: string;
  /** Same exact installed version pin. */
  requiredVersion: string;
  [key: string]: unknown;
}

export type SharedMap = Record<string, SharedEntryOut>;

/**
 * Thrown when a declared shared dependency cannot be resolved to an installed
 * `package.json` from the context. `defineShared` never substitutes a
 * placeholder, range, or `unknown` version.
 */
export class SharedDependencyUnresolvedError extends Error {
  constructor(
    public packageName: string,
    public context: string
  ) {
    super(
      `defineShared: cannot resolve an installed version for "${packageName}" from context "${context}".\n` +
        'Shared dependencies must be pinned to one exact installed version so host and remotes agree — ' +
        'an unresolvable package cannot be pinned, and no placeholder or range is substituted.\n' +
        `Fix: install "${packageName}" in the app resolved from "${context}", ` +
        'or remove it from the shared dependency list.'
    );
    this.name = 'SharedDependencyUnresolvedError';
  }
}

/**
 * Build the Module Federation `shared` map for `deps`, pinning `version` and
 * `requiredVersion` of every entry to the exact version of the package
 * actually installed and resolvable from `options.context`.
 *
 * Conventions applied when the user config does not set the key explicitly:
 *
 * - `singleton`: `true`
 * - `eager`: `mode === 'standalone'` → `true`; otherwise role `host` → `true`,
 *   role `remote` → `false`
 *
 * Keys ending in `/` (deep-import markers like `react-native/`) are emitted
 * verbatim and never version-resolved; `defineShared` never injects them —
 * the federation plugins already add and dedupe those.
 *
 * The `mode` derivation from the CLI (`env.argv?.standalone`) deliberately
 * lives in the calling config, not here: this function is pure with respect
 * to the environment beyond explicit options.
 */
export function defineShared(
  deps: DefineSharedDeps,
  options: DefineSharedOptions = {}
): SharedMap {
  const context = options.context ?? process.cwd();
  const role = options.role ?? 'host';
  const mode = options.mode ?? 'federated';
  const conventionEager = mode === 'standalone' || role === 'host';

  const versionCache = new Map<string, string>();
  const shared: SharedMap = {};

  for (const { name, config } of normalizeSharedEntries(deps)) {
    // Deep-import prefix markers are webpack matching hints, not packages:
    // emit the user config verbatim and skip version resolution entirely.
    if (name.endsWith('/')) {
      // Verbatim user config: deep-import markers intentionally carry no
      // pins/convention fields, so the cast only satisfies the shared type.
      shared[name] = { ...config } as SharedEntryOut;
      continue;
    }

    if (!versionCache.has(name)) {
      const installed = resolveInstalledVersion(name, context);
      if (installed === 'unknown') {
        throw new SharedDependencyUnresolvedError(name, context);
      }
      versionCache.set(name, installed);
    }
    const version = versionCache.get(name)!;

    const { singleton, eager, ...rest } = config;
    shared[name] = {
      ...rest,
      singleton: singleton === undefined ? true : Boolean(singleton as unknown),
      eager: eager === undefined ? conventionEager : Boolean(eager as unknown),
      version,
      requiredVersion: version,
    };
  }

  return shared;
}
