import { isFailedRequest, NO_RESPONSE_STATUS } from '../shared/requests.js';
import type {
  DevServerRequest,
  Diagnostic,
  PlatformCompilation,
} from '../shared/types.js';

const MAX_REQUEST_DIAGNOSTICS = 20;

export const getRequestPlatform = (url: string): string | undefined => {
  const query = url.split('?')[1];
  const fromQuery = query
    ? (new URLSearchParams(query).get('platform') ?? undefined)
    : undefined;
  if (fromQuery) return fromQuery;
  return /\/(ios|android)\//.exec(url)?.[1];
};

const pathname = (url: string) => url.split('?')[0];

const basename = (url: string) => {
  const parts = pathname(url).split('/');
  return parts[parts.length - 1] ?? '';
};

const commonPrefix = (a: string, b: string) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

/** Emitted asset names that look most like the requested file. */
export const findSimilarAssets = (
  requested: string,
  assets: string[],
  limit = 3
) =>
  assets
    .map((name) => ({
      name,
      score: commonPrefix(basename(name), requested),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.name);

const firstLine = (value?: string) => value?.split('\n').find(Boolean)?.trim();

export const diagnoseCompilations = (
  compilations: PlatformCompilation[]
): Diagnostic[] =>
  compilations
    .filter((compilation) => compilation.status === 'failed')
    .map((compilation) => ({
      severity: 'error',
      area: 'compilation',
      message: `Compilation for ${compilation.platform} failed with ${compilation.errorCount} error(s): ${firstLine(compilation.errors[0]?.message) ?? 'see errors'}${compilation.errors[0]?.moduleName ? ` (${compilation.errors[0].moduleName})` : ''}.`,
      hint: 'Fix the compilation error first: the app keeps running the last successful bundle and HMR stops applying updates.',
      ref: `compilation:${compilation.platform}`,
    }));

export const diagnoseRequests = (
  requests: DevServerRequest[],
  compilations: PlatformCompilation[]
): Diagnostic[] => {
  const groups = new Map<string, DevServerRequest[]>();
  for (const request of requests) {
    if (!isFailedRequest(request)) continue;
    const key = `${request.method} ${pathname(request.url)} ${request.status}`;
    const group = groups.get(key) ?? [];
    group.push(request);
    groups.set(key, group);
  }

  const diagnostics: Diagnostic[] = [];
  for (const [key, group] of Array.from(groups).slice(
    -MAX_REQUEST_DIAGNOSTICS
  )) {
    const latest = group[group.length - 1];
    const times = group.length > 1 ? ` (${group.length}x)` : '';
    const body = firstLine(latest.responseBody);
    const ref = `request:${latest.seq}`;

    if (latest.fault) {
      diagnostics.push({
        severity: 'info',
        area: 'faults',
        message: `${latest.status === NO_RESPONSE_STATUS ? `${latest.method} ${pathname(latest.url)} (connection dropped)` : key}${times}: produced by injected fault ${latest.fault}.`,
        hint: 'Check how the app handled it (list-script-calls, list-errors), not why the server failed.',
        ref,
      });
      continue;
    }

    if (
      latest.status === 404 &&
      /\.(bundle|js|map|json)$/.test(pathname(latest.url))
    ) {
      const platform = latest.platform ?? getRequestPlatform(latest.url);
      const compilation = compilations.find(
        (item) => item.platform === platform
      );
      const similar = compilation
        ? findSimilarAssets(
            basename(latest.url),
            compilation.assets.map((asset) => asset.name)
          )
        : [];
      diagnostics.push({
        severity: 'error',
        area: 'dev-server',
        message: `${key}${times}: the dev server has no asset for this URL.`,
        hint: compilation
          ? similar.length
            ? `Emitted ${platform} assets with a similar name: ${similar.join(', ')}. Compare the resolver URL with output.filename/chunkFilename and the extraChunks config.`
            : `No ${platform} asset with a similar name was emitted; the chunk may belong to another compilation (MF remote dev server) or was never built.`
          : `No compilation for platform "${platform ?? 'unknown'}" has run on this server.`,
        ref,
      });
      continue;
    }

    if (latest.status === NO_RESPONSE_STATUS) {
      diagnostics.push({
        severity: 'error',
        area: 'dev-server',
        message: `${latest.method} ${pathname(latest.url)}${times}: the connection closed before the dev server sent a response.`,
        hint: 'The client gave up (timeout) or the server crashed mid-request; check the dev server output.',
        ref,
      });
      continue;
    }

    if (pathname(latest.url) === '/symbolicate') {
      diagnostics.push({
        severity: 'warning',
        area: 'symbolication',
        message: `${key}${times}: ${body ?? 'symbolication failed'}.`,
        hint: 'Usually the posted stack had no frame with a bundle URL carrying the platform; the response body above is from the dev server.',
        ref,
      });
      continue;
    }

    diagnostics.push({
      severity: latest.status >= 500 ? 'error' : 'warning',
      area: 'dev-server',
      message: `${key}${times}${body ? `: ${body}` : ''}.`,
      ref,
    });
  }
  return diagnostics;
};
