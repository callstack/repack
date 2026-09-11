const FETCH_TIMEOUT_MS = 2_000;
const CACHE_TTL_MS = 10_000;
const REMOTE_SOURCE_PATH_PREFIX = '/__repack_source__/';
const PROJECT_ROOT_SOURCE_PATTERN = /^\[projectRoot(?:\^\d+)?\][\\/]/;

interface SourceMapLike {
  version?: unknown;
  mappings?: unknown;
  sources?: unknown[];
  sections?: Array<{ map?: SourceMapLike }>;
}

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

function prepareSourceMap(buffer: Buffer, bundleUrl: URL): Buffer | undefined {
  try {
    const map = JSON.parse(buffer.toString('utf8')) as SourceMapLike;
    if (
      map?.version !== 3 ||
      (typeof map.mappings !== 'string' && !Array.isArray(map.sections))
    ) {
      return undefined;
    }

    const addRemoteOrigin = (sourceMap: SourceMapLike) => {
      if (Array.isArray(sourceMap.sources)) {
        sourceMap.sources = sourceMap.sources.map((source) => {
          if (
            typeof source !== 'string' ||
            !PROJECT_ROOT_SOURCE_PATTERN.test(source)
          ) {
            return source;
          }

          const sourceUrl = new URL(bundleUrl.origin);
          sourceUrl.pathname = `${REMOTE_SOURCE_PATH_PREFIX}${source}`;
          return sourceUrl.href;
        });
      }

      for (const section of sourceMap.sections ?? []) {
        if (section.map) {
          addRemoteOrigin(section.map);
        }
      }
    };

    addRemoteOrigin(map);
    return Buffer.from(JSON.stringify(map));
  } catch {
    return undefined;
  }
}

export function getRemoteSource(fileUrl: string):
  | {
      file: string;
      origin: string;
    }
  | undefined {
  const sourceUrl = toHttpUrl(fileUrl);
  if (!sourceUrl?.pathname.startsWith(REMOTE_SOURCE_PATH_PREFIX)) {
    return undefined;
  }

  const file = decodeURIComponent(
    sourceUrl.pathname.slice(REMOTE_SOURCE_PATH_PREFIX.length)
  );
  if (!PROJECT_ROOT_SOURCE_PATTERN.test(file)) {
    return undefined;
  }

  return { file, origin: sourceUrl.origin };
}

export async function openRemoteStackFrame(
  fileUrl: string,
  lineNumber: number
): Promise<boolean> {
  const source = getRemoteSource(fileUrl);
  if (!source) {
    return false;
  }

  const response = await fetch(new URL('/open-stack-frame', source.origin), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ file: source.file, lineNumber }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Remote dev server returned ${response.status}`);
  }

  return true;
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
  return sourceMap ? prepareSourceMap(sourceMap, bundleUrl) : undefined;
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
