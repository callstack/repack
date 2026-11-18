import type { FederationState, ScriptRecord } from './types';

export const toOrigin = (url: string | undefined) => {
  if (!url || !/^https?:\/\//.test(url)) return undefined;
  const match = /^(https?:\/\/[^/]+)/.exec(url);
  return match?.[1];
};

const MAX_REMOTE_DEV_SERVERS = 5;

export type RemoteOrigin = {
  origin: string;
  /** An MF remote entry points here, so it is expected to be a dev server. */
  mfRemote: boolean;
};

/**
 * Origins other than the app's dev server that MF remotes or ScriptManager
 * scripts come from, e.g. a mini app's dev server on :8082. Their compile
 * and request diagnostics explain a failed remote load. MF remote origins come
 * first; script origins may also be CDNs, so callers pass the ones already
 * found not to be dev servers in `skip`.
 */
export const getRemoteDevServerOrigins = (
  federation: Pick<FederationState, 'instances'>,
  scripts: Pick<ScriptRecord, 'locator'>[],
  appOrigin: string | undefined,
  skip: ReadonlySet<string> = new Set()
): RemoteOrigin[] => {
  const origins = new Map<string, boolean>();
  for (const instance of federation.instances) {
    for (const remote of instance.remotes) {
      const origin = toOrigin(remote.entry);
      if (origin) origins.set(origin, true);
    }
  }
  for (const record of scripts) {
    const origin = toOrigin(record.locator?.url);
    if (origin && !origins.has(origin) && !skip.has(origin)) {
      origins.set(origin, false);
    }
  }
  if (appOrigin) origins.delete(appOrigin);
  return Array.from(origins, ([origin, mfRemote]) => ({
    origin,
    mfRemote,
  })).slice(0, MAX_REMOTE_DEV_SERVERS);
};
