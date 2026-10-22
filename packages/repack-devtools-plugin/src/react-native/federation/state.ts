import {
  getProp,
  isRecord,
  readArray,
  readBoolean,
  readString,
  toStringArray,
} from '../../shared/guards';
import type {
  Diagnostic,
  FederationEvent,
  FederationInstance,
  FederationRemote,
  FederationSharedPackage,
  FederationSharedVersion,
  FederationState,
} from '../../shared/types';

export type FederationGlobals = {
  /** `globalThis.__FEDERATION__` (Module Federation 2). */
  federation?: unknown;
  /** `__webpack_require__.S` (Module Federation 1 share scopes). */
  webpackShareScopes?: unknown;
  runtimePluginInstalled: boolean;
  events: FederationEvent[];
};

/** Package-manager protocols such as `workspace:*` or `catalog:testers`. */
const PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;

const parseVersion = (value: string) => {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(value.trim());
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
};

const compare = (a: number[], b: number[]) => {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
};

/**
 * Small semver range check covering the forms MF configs use in practice
 * (`*`, exact, `^`, `~`, `>=`). Returns `undefined` for anything else, so
 * unknown ranges never produce false positives.
 */
export const satisfiesRange = (
  version: string,
  range: string
): boolean | undefined => {
  const trimmed = range.trim();
  if (trimmed === '*' || trimmed === '') return true;
  const parsedVersion = parseVersion(version);
  if (!parsedVersion) return undefined;
  const operator = /^(\^|~|>=|=)?/.exec(trimmed)?.[1] ?? '';
  const parsedRange = parseVersion(trimmed.slice(operator.length));
  if (!parsedRange || /\s|\|\||<|>(?!=)/.test(trimmed.slice(operator.length))) {
    return undefined;
  }
  const cmp = compare(parsedVersion, parsedRange);
  switch (operator) {
    case '':
    case '=':
      return cmp === 0;
    case '>=':
      return cmp >= 0;
    case '~':
      return (
        cmp >= 0 &&
        parsedVersion[0] === parsedRange[0] &&
        parsedVersion[1] === parsedRange[1]
      );
    case '^': {
      if (cmp < 0) return false;
      if (parsedRange[0] > 0) return parsedVersion[0] === parsedRange[0];
      if (parsedRange[1] > 0) {
        return parsedVersion[0] === 0 && parsedVersion[1] === parsedRange[1];
      }
      return cmp === 0;
    }
  }
  return undefined;
};

const readRequiredVersion = (shareConfig: unknown) => {
  const value = getProp(shareConfig, 'requiredVersion');
  return typeof value === 'string' || value === false ? value : undefined;
};

/**
 * Flattens an MF share scope map: `{ [scope]: { [pkg]: { [version]: entry } } }`.
 * MF 2 instances and MF 1 `__webpack_require__.S` share this layout.
 */
const toSharedPackages = (
  shareScopeMap: unknown
): FederationSharedPackage[] => {
  if (!isRecord(shareScopeMap)) return [];
  const packages: FederationSharedPackage[] = [];
  for (const [scope, scopeEntries] of Object.entries(shareScopeMap)) {
    if (!isRecord(scopeEntries)) continue;
    for (const [name, versions] of Object.entries(scopeEntries)) {
      if (!isRecord(versions)) continue;
      packages.push({
        scope,
        name,
        versions: Object.entries(versions).map(
          ([version, entry]): FederationSharedVersion => {
            const shareConfig = getProp(entry, 'shareConfig');
            return {
              version: readString(entry, 'version') ?? version,
              from: readString(entry, 'from'),
              loaded: Boolean(getProp(entry, 'loaded')),
              eager:
                readBoolean(entry, 'eager') ??
                readBoolean(shareConfig, 'eager'),
              singleton: readBoolean(shareConfig, 'singleton'),
              requiredVersion: readRequiredVersion(shareConfig),
              strictVersion: readBoolean(shareConfig, 'strictVersion'),
              useIn: toStringArray(getProp(entry, 'useIn')),
            };
          }
        ),
      });
    }
  }
  return packages.sort((a, b) =>
    `${a.scope}/${a.name}`.localeCompare(`${b.scope}/${b.name}`)
  );
};

const toShareScope = (value: unknown) => {
  const single = typeof value === 'string' ? value : undefined;
  return single ?? toStringArray(value);
};

const toInstance = (instance: unknown): FederationInstance => {
  const moduleCache = getProp(instance, 'moduleCache');
  const loadedModules =
    moduleCache instanceof Map
      ? Array.from(moduleCache.keys()).filter(
          (key): key is string => typeof key === 'string'
        )
      : [];
  const options = getProp(instance, 'options');
  const remotes: FederationRemote[] = readArray(options, 'remotes').map(
    (remote) => {
      const name = readString(remote, 'name') ?? '(unnamed)';
      return {
        name,
        alias: readString(remote, 'alias'),
        entry: readString(remote, 'entry'),
        version: readString(remote, 'version'),
        type: readString(remote, 'type'),
        shareScope: toShareScope(getProp(remote, 'shareScope')),
        loaded: loadedModules.includes(name),
      };
    }
  );
  return {
    name:
      readString(instance, 'name') ??
      readString(options, 'name') ??
      '(unnamed)',
    version: readString(options, 'version'),
    remotes,
    shared: toSharedPackages(getProp(instance, 'shareScopeMap')),
    loadedModules,
  };
};

const describeVersion = (entry: FederationSharedVersion) =>
  `${entry.version}${entry.from ? ` (from ${entry.from})` : ''}`;

export const diagnoseSharedPackages = (
  packages: FederationSharedPackage[],
  owner: string
): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  for (const pkg of packages) {
    const ref = `${owner}:${pkg.scope}/${pkg.name}`;
    const loaded = pkg.versions.filter((entry) => entry.loaded);
    const singleton = pkg.versions.some((entry) => entry.singleton);

    if (singleton && loaded.length > 1) {
      diagnostics.push({
        severity: 'error',
        area: 'federation',
        message: `Singleton "${pkg.name}" is loaded in ${loaded.length} versions: ${loaded.map(describeVersion).join(', ')}.`,
        hint: 'Two copies of a singleton usually means a remote was initialised before the host shared it, or the versions do not satisfy each other. Check `eager`, `requiredVersion` and the order of `init`/`loadRemote`.',
        ref,
      });
    } else if (singleton && pkg.versions.length > 1) {
      diagnostics.push({
        severity: 'warning',
        area: 'federation',
        message: `Singleton "${pkg.name}" has ${pkg.versions.length} versions registered: ${pkg.versions.map(describeVersion).join(', ')}.`,
        hint: 'Only one is used; make sure the selected one satisfies every `requiredVersion`.',
        ref,
      });
    }

    const invalid = pkg.versions.filter(
      (entry) =>
        parseVersion(entry.version) === undefined ||
        (typeof entry.requiredVersion === 'string' &&
          PROTOCOL.test(entry.requiredVersion))
    );
    if (invalid.length > 0) {
      const values = invalid.map((entry) =>
        typeof entry.requiredVersion === 'string' &&
        PROTOCOL.test(entry.requiredVersion)
          ? `requiredVersion "${entry.requiredVersion}"`
          : `version "${entry.version}"`
      );
      diagnostics.push({
        severity: 'warning',
        area: 'federation',
        message: `Shared "${pkg.name}" is registered with ${Array.from(new Set(values)).join(', ')}${invalid[0].from ? ` by ${invalid[0].from}` : ''}, which is not semver.`,
        hint: 'Usually a `workspace:` or `catalog:` specifier copied from package.json into the MF `shared` config. MF cannot compare it, logs "does not satisfy the requirement" and may load another copy. Use the installed package version (its package.json `version`).',
        ref,
      });
    }

    const selected = loaded[0];
    if (!selected) continue;
    for (const entry of pkg.versions) {
      if (typeof entry.requiredVersion !== 'string') continue;
      const satisfied = satisfiesRange(selected.version, entry.requiredVersion);
      if (satisfied === false) {
        diagnostics.push({
          severity: entry.strictVersion ? 'error' : 'warning',
          area: 'federation',
          message: `"${pkg.name}" ${describeVersion(selected)} is loaded but ${entry.from ?? 'a container'} requires ${entry.requiredVersion}.`,
          hint: entry.strictVersion
            ? '`strictVersion` is set, so MF should have thrown or fallen back; check errorLoadShare events.'
            : 'MF only warns about this; the consumer may run against an incompatible version.',
          ref,
        });
      }
    }
  }
  return diagnostics;
};

const NETWORK_ERROR = /Network request failed|ECONNREFUSED|Failed to fetch/i;
const JSON_ERROR = /JSON Parse error|Unexpected token|is not valid JSON/i;

const httpStatusOf = (detail?: string) => /HTTP \d{3}/.exec(detail ?? '')?.[0];

const originOf = (url?: string) => /^(https?:\/\/[^/]+)/.exec(url ?? '')?.[1];

export const diagnoseFederationEvents = (
  events: FederationEvent[]
): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    if (!event.error && event.type !== 'loadEntryError') continue;
    const key = `${event.type}:${event.id ?? ''}:${event.remote ?? ''}:${event.url ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const target = event.id ?? event.remote ?? event.url ?? 'unknown';
    diagnostics.push({
      severity: 'error',
      area: 'federation',
      message: `${event.type} failed for ${target}${event.url ? ` (${event.url})` : ''}: ${event.error ?? 'remote entry failed to load'}`,
      hint: NETWORK_ERROR.test(event.error ?? '')
        ? `The device could not reach ${originOf(event.url) ?? 'the remote'}: check that its dev server is running and the port is reachable from the device (Android: adb reverse). get-dev-server with origin=${originOf(event.url) ?? '<remote origin>'} shows whether it is up.`
        : JSON_ERROR.test(event.error ?? '') && event.url?.includes('.json')
          ? `The manifest response${httpStatusOf(event.detail) ? ` (${httpStatusOf(event.detail)})` : ''} was not JSON. MF parses the body without checking the HTTP status, so an error page (4xx/5xx, CDN or proxy HTML) shows up as a parse error. Look up the request with get-dev-server origin=${originOf(event.url) ?? '<remote origin>'} --requests failed, or fetch the URL.`
          : event.type === 'afterLoadManifest'
            ? 'Check that the remote dev server is running and serves this manifest URL for the current platform.'
            : 'Look up the remote entry URL in the dev server request log and the ScriptManager records for the container.',
      ref: `federation-event:${event.seq}`,
    });
  }
  return diagnostics;
};

export const readFederationState = (
  globals: FederationGlobals
): FederationState => {
  const instances = readArray(globals.federation, '__INSTANCES__').map(
    toInstance
  );
  const runtime: FederationState['runtime'] = globals.federation
    ? 'v2'
    : globals.webpackShareScopes
      ? 'v1'
      : 'none';
  const shareScopes =
    runtime === 'v1' ? toSharedPackages(globals.webpackShareScopes) : undefined;

  const diagnostics = [
    ...instances.flatMap((instance) =>
      diagnoseSharedPackages(instance.shared, instance.name)
    ),
    ...(shareScopes ? diagnoseSharedPackages(shareScopes, 'webpack') : []),
    ...diagnoseFederationEvents(globals.events),
  ];

  if (runtime === 'v2' && !globals.runtimePluginInstalled) {
    diagnostics.push({
      severity: 'info',
      area: 'federation',
      message:
        'The devtools MF runtime plugin is not registered, so remote and shared lifecycle events are not recorded.',
      hint: "Add require.resolve('@callstack/repack-devtools-plugin/mf-runtime-plugin') to `runtimePlugins`, or call installRepackDevTools() early.",
    });
  }

  return {
    runtime,
    instances,
    shareScopes,
    runtimePluginInstalled: globals.runtimePluginInstalled,
    diagnostics,
  };
};
