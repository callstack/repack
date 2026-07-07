const FETCH_TIMEOUT_MS = 2000;
const CACHE_TTL_MS = 10_000;

interface CacheEntry {
  expiresAt: number;
  sourceMap: Buffer | undefined;
}

const cache = new Map<string, CacheEntry>();

/**
 * Interprets a stack-frame file value as an HTTP(S) URL. Stack frames can
 * carry scheme-less URLs (e.g. `localhost:8081/index.bundle` on iOS
 * simulators or `10.0.2.2:8081/index.bundle` on Android emulators); note that
 * `new URL('localhost:8081/...')` parses successfully with `localhost:` as
 * the scheme, so coercion applies whenever the result is not http(s) — not
 * only when parsing throws.
 */
export function coerceToHttpUrl(fileUrl: string): URL | undefined {
  const candidates: Array<{ url: string; coerced: boolean }> = [
    { url: fileUrl, coerced: false },
    {
      url: fileUrl.startsWith('//') ? `http:${fileUrl}` : `http://${fileUrl}`,
      coerced: true,
    },
  ];

  for (const { url, coerced } of candidates) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      continue;
    }
    if (parsed.hostname !== 'localhost' && !parsed.hostname.includes('.')) {
      continue;
    }
    // Scheme-less frame URLs always carry the dev server port; requiring it
    // stops bare filenames (e.g. `some.chunk.bundle`) from being mistaken
    // for hostnames.
    if (coerced && parsed.port === '') {
      continue;
    }
    return parsed;
  }

  return undefined;
}

/** A minimal shape check so an HTML catch-all response or a wrong file can never be used as a source map. */
function looksLikeSourceMap(buffer: Buffer): boolean {
  try {
    const map = JSON.parse(buffer.toString('utf8'));
    return (
      map !== null &&
      typeof map === 'object' &&
      map.version === 3 &&
      (typeof map.mappings === 'string' || Array.isArray(map.sections))
    );
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: URL): Promise<Buffer | undefined> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    return undefined;
  }
  return Buffer.from(await response.arrayBuffer());
}

async function lookupDeclaredSourceMap(
  fileUrl: string
): Promise<Buffer | undefined> {
  const bundleUrl = coerceToHttpUrl(fileUrl);
  if (!bundleUrl) {
    return undefined;
  }

  const bundle = await fetchWithTimeout(bundleUrl);
  if (!bundle) {
    return undefined;
  }

  // The comment is appended at the end of the bundle, so search backwards.
  const text = bundle.toString('utf8');
  const commentIndex = text.lastIndexOf('sourceMappingURL=');
  if (commentIndex === -1) {
    return undefined;
  }
  const declared = text
    .slice(commentIndex + 'sourceMappingURL='.length)
    .match(/^(\S+)/)?.[1];
  if (!declared) {
    return undefined;
  }

  const sourceMapUrl = new URL(declared, bundleUrl);
  if (sourceMapUrl.protocol !== 'http:' && sourceMapUrl.protocol !== 'https:') {
    return undefined;
  }

  const sourceMap = await fetchWithTimeout(sourceMapUrl);
  if (!sourceMap || !looksLikeSourceMap(sourceMap)) {
    return undefined;
  }
  return sourceMap;
}

/**
 * Fetches the source map that a served bundle declares for itself via its
 * `//# sourceMappingURL=` comment, resolved relative to the bundle URL.
 *
 * This is the fallback for bundles the local compiler did not build — e.g.
 * Module Federation remote containers and chunks served by another dev
 * server. It follows the standard resolution browsers and symbolication
 * services use: only the declared reference is trusted; if a bundle declares
 * no source map, the lookup fails rather than guessing filenames.
 *
 * Results (including misses) are memoized for a short interval so repeated
 * symbolication requests don't refetch on every error report.
 */
export async function fetchDeclaredSourceMap(
  fileUrl: string
): Promise<Buffer | undefined> {
  const cached = cache.get(fileUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.sourceMap;
  }

  let sourceMap: Buffer | undefined;
  try {
    sourceMap = await lookupDeclaredSourceMap(fileUrl);
  } catch {
    sourceMap = undefined;
  }

  cache.set(fileUrl, { expiresAt: Date.now() + CACHE_TTL_MS, sourceMap });
  return sourceMap;
}
