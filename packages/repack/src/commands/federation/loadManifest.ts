import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_MANIFEST_FILENAME,
  type FederationManifest,
} from '../../plugins/federationManifest/types.js';

/** Result of loading a manifest from any supported source. */
export interface LoadedManifest {
  /** The validated manifest document. */
  manifest: FederationManifest;
  /** The source string exactly as passed to `loadManifest`. */
  source: string;
  /** The concrete file path or URL the manifest was read from. */
  resolvedFrom: string;
}

export interface LoadManifestOptions {
  /**
   * Explicit manifest file/URL to use instead of appending
   * `repack-federation-manifest.json` to the source. Applied to both
   * filesystem and http(s) sources.
   */
  manifestPath?: string;
}

/** No manifest document exists at the given source. */
export class ManifestNotFoundError extends Error {
  constructor(
    message: string,
    public readonly source: string
  ) {
    super(message);
    this.name = 'ManifestNotFoundError';
  }
}

/** A manifest exists at the source but it cannot be read or parsed. */
export class ManifestInvalidError extends Error {
  constructor(
    message: string,
    public readonly source: string
  ) {
    super(message);
    this.name = 'ManifestInvalidError';
  }
}

/**
 * Minimal runtime check for a manifest document: a numeric
 * `manifestVersion` and a `name` or `id` to identify it by.
 */
function isFederationManifest(value: unknown): value is FederationManifest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.manifestVersion === 'number' &&
    (typeof candidate.name === 'string' || typeof candidate.id === 'string')
  );
}

function parseAndValidate(
  content: string,
  source: string,
  resolvedFrom: string
): LoadedManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ManifestInvalidError(
      `Manifest at ${resolvedFrom} is not valid JSON.`,
      source
    );
  }
  if (!isFederationManifest(parsed)) {
    throw new ManifestInvalidError(
      `Manifest at ${resolvedFrom} does not look like a federation manifest: ` +
        'it must have a numeric "manifestVersion" and a "name" or "id" string.',
      source
    );
  }
  return { manifest: parsed, source, resolvedFrom };
}

function isHttpUrl(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

function manifestUrlFrom(base: string): URL {
  const url = new URL(base);
  if (url.pathname.endsWith('.json')) return url;
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  url.pathname += DEFAULT_MANIFEST_FILENAME;
  return url;
}

async function loadFromUrl(
  source: string,
  options: LoadManifestOptions
): Promise<LoadedManifest> {
  const url = manifestUrlFrom(options.manifestPath ?? source);
  let response: Response;
  try {
    response = await globalThis.fetch(url);
  } catch (error) {
    throw new ManifestInvalidError(
      `Could not fetch manifest from ${url}: ${error instanceof Error ? error.message : String(error)}`,
      source
    );
  }
  if (!response.ok) {
    throw new ManifestNotFoundError(
      `No manifest found at ${url} (HTTP ${response.status}).`,
      source
    );
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (error) {
    throw new ManifestInvalidError(
      `Manifest response from ${url} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      source
    );
  }
  if (!isFederationManifest(parsed)) {
    throw new ManifestInvalidError(
      `Manifest at ${url} does not look like a federation manifest: ` +
        'it must have a numeric "manifestVersion" and a "name" or "id" string.',
      source
    );
  }
  return { manifest: parsed, source, resolvedFrom: url.toString() };
}

async function loadFromFile(
  source: string,
  options: LoadManifestOptions
): Promise<LoadedManifest> {
  const base = path.resolve(options.manifestPath ?? source);
  let isDirectory = false;
  try {
    isDirectory = fs.statSync(base).isDirectory();
  } catch {
    throw new ManifestNotFoundError(
      options.manifestPath
        ? `No manifest file at ${base}.`
        : `No manifest found at ${base}. Pass a file, a directory containing ${DEFAULT_MANIFEST_FILENAME}, or a URL.`,
      source
    );
  }
  const filePath = isDirectory
    ? path.join(base, DEFAULT_MANIFEST_FILENAME)
    : base;
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ManifestNotFoundError(
        `No manifest file at ${filePath}.`,
        source
      );
    }
    throw new ManifestInvalidError(
      `Could not read manifest at ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      source
    );
  }
  return parseAndValidate(content, source, filePath);
}

/**
 * Load a federation manifest from a file path, a directory containing
 * `repack-federation-manifest.json`, or an http(s) URL. Sources (and
 * `manifestPath` values) ending in `.json` are used as-is; otherwise the
 * default manifest filename is appended.
 */
export async function loadManifest(
  source: string,
  options: LoadManifestOptions = {}
): Promise<LoadedManifest> {
  return isHttpUrl(options.manifestPath ?? source)
    ? loadFromUrl(source, options)
    : loadFromFile(source, options);
}
