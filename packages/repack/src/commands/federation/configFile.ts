import fs from 'node:fs';
import path from 'node:path';
import { CLIError } from '../../helpers/index.js';

/** Name of the federation workspace config file tools discover and load. */
export const FEDERATION_CONFIG_FILENAME = 'repack-federation.json';

/** `host` entry of `repack-federation.json`. */
export interface FederationHostConfig {
  /** Manifest source: .json path, directory, or http(s) URL. */
  manifest: string;
  /** App root, for consumers that need it (init, dry-run). */
  root?: string;
}

/** One named entry of the `remotes` map. */
export interface FederationRemoteConfig {
  manifest: string;
  root?: string;
  /** Whether this remote supports `--standalone` mode. */
  standalone?: boolean;
  /** Dev-server port. Declared for the later runner/wizard PR; unused today. */
  port?: number;
}

export interface FederationConfig {
  host: FederationHostConfig;
  remotes: Record<string, FederationRemoteConfig>;
}

/**
 * A discovered `repack-federation.json` that is not valid JSON or does not
 * conform to the schema. Tools must print `reasons` with the file path and
 * exit 2 — never fall back to defaults, never print a stack.
 */
export class ConfigFileInvalidError extends Error {
  constructor(
    public filePath: string,
    public reasons: string[]
  ) {
    super(`${filePath}: ${reasons.join('; ')}`);
    this.name = 'ConfigFileInvalidError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Field checker: returns a reason string when the value is invalid. */
type FieldCheck = (value: unknown, where: string) => string | undefined;

const requireString: FieldCheck = (value, where) =>
  typeof value === 'string' ? undefined : `${where} is required (string)`;

const optionalString: FieldCheck = (value, where) =>
  value === undefined || typeof value === 'string'
    ? undefined
    : `${where} must be a string`;

const optionalBoolean: FieldCheck = (value, where) =>
  value === undefined || typeof value === 'boolean'
    ? undefined
    : `${where} must be a boolean`;

const optionalNumber: FieldCheck = (value, where) =>
  value === undefined || typeof value === 'number'
    ? undefined
    : `${where} must be a number`;

/**
 * Run per-field checks over an object, collecting one reason per violation.
 * Unknown keys are reported by path; missing required keys are appended by
 * the caller after the pass (a missing key never reaches a checker).
 */
function checkFields(
  target: Record<string, unknown>,
  known: Record<string, FieldCheck>,
  prefix: string,
  reasons: string[]
): void {
  for (const [key, value] of Object.entries(target)) {
    const where = prefix ? `${prefix}.${key}` : key;
    const check = known[key];
    if (!check) {
      reasons.push(`${where} is not a known field`);
      continue;
    }
    const problem = check(value, where);
    if (problem) reasons.push(problem);
  }
}

/**
 * Validate an unknown JSON document against the `repack-federation.json`
 * schema: `{ host: { manifest, root? }, remotes: { name: { manifest, root?,
 * standalone?, port? } } }`, strictly — unknown keys anywhere are invalid.
 * Returns the reasons the document is invalid (empty when valid); every
 * reason names the offending field path.
 */
export function validateFederationConfig(document: unknown): string[] {
  if (!isObject(document)) return ['config must be a JSON object'];

  const reasons: string[] = [];
  checkFields(
    document,
    {
      host: () => undefined,
      remotes: () => undefined,
    },
    '',
    reasons
  );
  const { host, remotes } = document;

  if (host === undefined) {
    reasons.push('host is required (object)');
  } else if (!isObject(host)) {
    reasons.push('host must be an object');
  } else {
    checkFields(
      host,
      { manifest: requireString, root: optionalString },
      'host',
      reasons
    );
    // A missing key never reaches a checker; a wrong-typed one already
    // produced the reason above — report each violation exactly once.
    if (!('manifest' in host)) {
      reasons.push('host.manifest is required (string)');
    }
  }

  if (remotes === undefined) {
    reasons.push('remotes is required (object)');
  } else if (Array.isArray(remotes)) {
    reasons.push('remotes must be a name-keyed object, not an array');
  } else if (!isObject(remotes)) {
    reasons.push('remotes must be an object');
  } else {
    for (const [name, entry] of Object.entries(remotes)) {
      const where = `remotes.${name}`;
      if (!isObject(entry)) {
        reasons.push(`${where} must be an object`);
        continue;
      }
      checkFields(
        entry,
        {
          manifest: requireString,
          root: optionalString,
          standalone: optionalBoolean,
          port: optionalNumber,
        },
        where,
        reasons
      );
      if (!('manifest' in entry)) {
        reasons.push(`${where}.manifest is required (string)`);
      }
    }
  }

  return reasons;
}

/**
 * Walk up from `cwd` looking for `repack-federation.json`; the first hit
 * wins. Returns null (never throws) when no file exists up the tree.
 */
export function findConfigPath(cwd: string): string | null {
  let currentDir = path.resolve(cwd);
  for (;;) {
    const candidate = path.join(currentDir, FEDERATION_CONFIG_FILENAME);
    if (fs.existsSync(candidate)) return candidate;
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
  }
}

/**
 * Build the `reasons[0]` for a failed `JSON.parse`: the SyntaxError message,
 * enriched with `(line X, column Y)` when the runtime exposes a position
 * (older V8 embeds `at position N` in the message; newer V8 exposes neither,
 * in which case the message is reported verbatim — "position if available").
 * Exported so the line/column math is testable independent of the runtime's
 * JSON error style.
 */
export function describeJsonParseFailure(
  rawText: string,
  error: unknown
): string {
  const syntaxError = error as SyntaxError & { position?: number };
  const message =
    syntaxError instanceof Error ? syntaxError.message : String(error);
  const fromMessage = /at position (\d+)/.exec(message)?.[1];
  const position =
    fromMessage !== undefined ? Number(fromMessage) : syntaxError.position;
  if (
    typeof position !== 'number' ||
    !Number.isFinite(position) ||
    position < 0 ||
    position > rawText.length
  ) {
    return `is not valid JSON: ${message}`;
  }
  const before = rawText.slice(0, position);
  const line = before.split('\n').length;
  const column = position - (before.lastIndexOf('\n') + 1) + 1;
  return `is not valid JSON: ${message} (line ${line}, column ${column})`;
}

/**
 * Discover and load the federation workspace config. Returns `null` when no
 * file exists; throws `ConfigFileInvalidError` for malformed JSON or schema
 * violations — the calling tool maps that to exit code 2.
 */
export function loadFederationConfig(options: { cwd?: string } = {}): {
  filePath: string;
  config: FederationConfig;
} | null {
  const filePath = findConfigPath(options.cwd ?? process.cwd());
  if (!filePath) return null;

  const rawText = fs.readFileSync(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch (error) {
    throw new ConfigFileInvalidError(filePath, [
      describeJsonParseFailure(rawText, error),
    ]);
  }

  const reasons = validateFederationConfig(parsed);
  if (reasons.length > 0) {
    throw new ConfigFileInvalidError(filePath, reasons);
  }
  return { filePath, config: parsed as FederationConfig };
}

/** A manifest source resolved for use by a tool. */
export interface ResolvedEntry {
  source: string;
  root?: string;
}

export interface ResolvedRemote {
  /** Declared name from the config file; flag-sourced remotes have none. */
  name?: string;
  source: string;
  root?: string;
  standalone?: boolean;
  port?: number;
}

export interface ResolvedWorkspace {
  configPath?: string;
  host?: ResolvedEntry;
  remotes: ResolvedRemote[];
  /** Where the effective values came from. */
  source: 'flags' | 'file' | 'mixed' | 'none';
}

/** Split a raw `--remotes` flag value, tolerating a merged CLI array. */
export function parseRemoteSources(
  remotes: string | string[] | undefined
): string[] {
  if (!remotes) return [];
  const values = Array.isArray(remotes) ? remotes : [remotes];
  return values.flatMap((value) =>
    value
      .split(',')
      .map((source) => source.trim())
      .filter(Boolean)
  );
}

function isUrlSource(source: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(source);
}

/** Path values resolve against the config dir; URLs stay verbatim. */
function resolveSource(source: string, configDir: string): string {
  return isUrlSource(source) ? source : path.resolve(configDir, source);
}

/**
 * Combine CLI flags, the discovered `repack-federation.json`, and defaults
 * into the workspace a command operates on. Precedence is per-value:
 * a flag overrides only its own value; `--remotes` replaces the remote set
 * wholesale (per-value merging of lists is undefined).
 */
export function resolveFederationWorkspace(
  cwd: string,
  flags: { host?: string; remotes?: string | string[] }
): ResolvedWorkspace {
  const loaded = loadFederationConfig({ cwd });
  const configDir = loaded ? path.dirname(loaded.filePath) : cwd;
  const flagRemotes = parseRemoteSources(flags.remotes);
  const usesFlags = flags.host !== undefined || flagRemotes.length > 0;
  // The file "supplies" values only where a flag did not already provide
  // one: all flags + a present-but-unused file is source `flags`, not mixed.
  const usesFile =
    loaded !== null && (flags.host === undefined || flagRemotes.length === 0);

  const workspace: ResolvedWorkspace = {
    remotes: [],
    source: usesFlags
      ? usesFile
        ? 'mixed'
        : 'flags'
      : loaded
        ? 'file'
        : 'none',
  };
  if (loaded) workspace.configPath = loaded.filePath;

  if (flags.host !== undefined) {
    workspace.host = { source: flags.host };
  } else if (loaded) {
    const { manifest, root } = loaded.config.host;
    workspace.host = {
      source: resolveSource(manifest, configDir),
      ...(root === undefined ? {} : { root: path.resolve(configDir, root) }),
    };
  }

  if (flagRemotes.length > 0) {
    workspace.remotes = flagRemotes.map((source) => ({ source }));
  } else if (loaded) {
    workspace.remotes = Object.entries(loaded.config.remotes).map(
      ([name, entry]) => ({
        name,
        source: resolveSource(entry.manifest, configDir),
        ...(entry.root === undefined
          ? {}
          : { root: path.resolve(configDir, entry.root) }),
        ...(entry.standalone === undefined
          ? {}
          : { standalone: entry.standalone }),
        ...(entry.port === undefined ? {} : { port: entry.port }),
      })
    );
  }

  return workspace;
}

/**
 * Tooling-side gate for `--standalone`: refuse only when a
 * `repack-federation.json` exists AND declares the app's entry as not
 * supporting standalone. No config file, or a root matching no remote
 * entry, proceeds unopposed — standalone needs no declaration to *work*,
 * only support-refusal needs the file. Bundler-runtime code never calls
 * this and never reads the workspace map.
 */
export function assertStandaloneSupported(rootDir: string): void {
  const target = path.resolve(rootDir);
  let loaded: ReturnType<typeof loadFederationConfig>;
  try {
    loaded = loadFederationConfig({ cwd: target });
  } catch (error) {
    if (error instanceof ConfigFileInvalidError) {
      // Refusal runs before any compile: a CLIError keeps the message
      // clear, the exit non-zero and the stack hidden (repo pattern).
      throw new CLIError(
        `--standalone refused: workspace config ${error.filePath}: ` +
          `${error.reasons.join('; ')} — fix it before requesting standalone mode.`
      );
    }
    throw error;
  }
  if (!loaded) return;

  const configDir = path.dirname(loaded.filePath);
  for (const [name, entry] of Object.entries(loaded.config.remotes)) {
    const entryRoot = path.resolve(configDir, entry.root ?? '.');
    if (entryRoot !== target) continue;
    if (entry.standalone !== true) {
      throw new CLIError(
        `--standalone refused: remote "${name}" does not declare standalone support. ` +
          `Set "standalone": true for it in ${loaded.filePath}.`
      );
    }
    return;
  }
}
