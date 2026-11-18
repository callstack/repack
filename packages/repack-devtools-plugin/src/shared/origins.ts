import type { FederationState, ScriptRecord } from './types';

export const toOrigin = (url: string | undefined) => {
  if (!url || !/^https?:\/\//.test(url)) return undefined;
  const match = /^(https?:\/\/[^/]+)/.exec(url);
  return match?.[1];
};

const MAX_REMOTE_DEV_SERVERS = 5;

/**
 * Origins other than the app's dev server that MF remotes or ScriptManager
 * scripts come from, e.g. a mini app's dev server on :8082. Their compile
 * and request diagnostics explain a failed remote load.
 */
export const getRemoteDevServerOrigins = (
  federation: Pick<FederationState, 'instances'>,
  scripts: Pick<ScriptRecord, 'locator'>[],
  appOrigin: string | undefined
) => {
  const origins = new Set<string>();
  for (const instance of federation.instances) {
    for (const remote of instance.remotes) {
      const origin = toOrigin(remote.entry);
      if (origin) origins.add(origin);
    }
  }
  for (const record of scripts) {
    const origin = toOrigin(record.locator?.url);
    if (origin) origins.add(origin);
  }
  if (appOrigin) origins.delete(appOrigin);
  return Array.from(origins).slice(0, MAX_REMOTE_DEV_SERVERS);
};
