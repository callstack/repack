const FETCH_TIMEOUT_MS = 2_000;
const CACHE_TTL_MS = 10_000;

interface CacheEntry {
  expiresAt: number;
  value: Promise<Buffer | undefined>;
}

const cache = new Map<string, CacheEntry>();

/**
 * Convert a stack-frame file value into a fetchable HTTP(S) URL.
 * React Native can omit the scheme for development-server URLs.
 */
export function toHttpUrl(fileUrl: string): URL | undefined {
  const candidates = [
    fileUrl,
    fileUrl.startsWith('//') ? `http:${fileUrl}` : `http://${fileUrl}`,
  ];

  for (const candidate of candidates) {
    let url: URL;
    try {
      url = new URL(candidate);
    } catch {
      continue;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      continue;
    }

    // A coerced value must look like a development-server address, not a
    // bundle filename that happened to parse as a hostname.
    if (
      candidate !== fileUrl &&
      url.port === '' &&
      url.hostname !== 'localhost'
    ) {
      continue;
    }

    return url;
  }

  return undefined;
}

function looksLikeSourceMap(buffer: Buffer): boolean {
  try {
    const map = JSON.parse(buffer.toString('utf8')) as {
      version?: unknown;
      mappings?: unknown;
      sections?: unknown;
    };
    return (
      map?.version === 3 &&
      (typeof map.mappings === 'string' || Array.isArray(map.sections))
    );
  } catch {
    return false;
  }
}

async function fetchBuffer(url: URL): Promise<Buffer | undefined> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    return undefined;
  }
  return Buffer.from(await response.arrayBuffer());
}

async function lookupSourceMap(fileUrl: string): Promise<Buffer | undefined> {
  const bundleUrl = toHttpUrl(fileUrl);
  if (!bundleUrl) {
    return undefined;
  }

  const bundle = await fetchBuffer(bundleUrl);
  if (!bundle) {
    return undefined;
  }

  const bundleText = bundle.toString('utf8');
  const sourceMappingUrlIndex = bundleText.lastIndexOf('sourceMappingURL=');
  if (sourceMappingUrlIndex === -1) {
    return undefined;
  }

  const declaredSourceMap = bundleText
    .slice(sourceMappingUrlIndex + 'sourceMappingURL='.length)
    .match(/^(\S+)/)?.[1]
    ?.replace(/\*\/$/, '');
  if (!declaredSourceMap) {
    return undefined;
  }

  const sourceMapUrl = new URL(declaredSourceMap, bundleUrl);
  if (sourceMapUrl.protocol !== 'http:' && sourceMapUrl.protocol !== 'https:') {
    return undefined;
  }

  const sourceMap = await fetchBuffer(sourceMapUrl);
  return sourceMap && looksLikeSourceMap(sourceMap) ? sourceMap : undefined;
}

/**
 * Fetch the source map explicitly declared by a bundle served by another
 * development server. Results and misses are cached briefly because React
 * Native usually sends call-stack and component-stack requests together.
 */
export async function fetchSourceMapFromBundle(
  fileUrl: string
): Promise<Buffer | undefined> {
  const now = Date.now();
  const cached = cache.get(fileUrl);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = lookupSourceMap(fileUrl).catch(() => undefined);
  cache.set(fileUrl, { expiresAt: now + CACHE_TTL_MS, value });
  return value;
}
