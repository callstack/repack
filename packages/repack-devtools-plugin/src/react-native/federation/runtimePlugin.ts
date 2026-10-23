import { LIMITS } from '../../shared/constants';
import { readNumber } from '../../shared/guards';
import type { FederationEvent } from '../../shared/types';
import {
  describeError,
  getStore,
  nextSeq,
  notify,
  pushBounded,
  recordError,
  truncate,
} from '../store';

export const RUNTIME_PLUGIN_NAME = 'repack-devtools-plugin';

type Origin = { name?: string } | undefined;
type RemoteLike = {
  name?: string;
  alias?: string;
  entry?: string;
  version?: string;
};

const instanceName = (origin: Origin) => origin?.name;

const errorMessage = (error: unknown) =>
  error === undefined ? undefined : truncate(describeError(error).message);

export const recordFederationEvent = (
  event: Omit<FederationEvent, 'seq' | 'at'>
) => {
  const store = getStore();
  pushBounded(
    store.federationEvents,
    { ...event, seq: nextSeq(store), at: Date.now() },
    LIMITS.federationEvents
  );
  notify(store);
};

/**
 * Module Federation 2 runtime plugin that records remote, shared and manifest
 * lifecycle events. Waterfall hooks return their arguments untouched and the
 * other hooks return nothing, so the plugin never changes how MF behaves and
 * never acts as an error-recovery fallback.
 *
 * Add it through `runtimePlugins` to capture events from app start;
 * `installRepackDevTools()` otherwise registers it on running instances.
 */
export const createRepackDevToolsRuntimePlugin = () => {
  getStore().hooked.runtimePlugin = true;

  return {
    name: RUNTIME_PLUGIN_NAME,

    beforeRequest(args: { id: string; origin?: Origin }) {
      recordFederationEvent({
        type: 'beforeRequest',
        instance: instanceName(args.origin),
        id: args.id,
      });
      return args;
    },

    afterResolve(args: {
      id?: string;
      pkgNameOrAlias?: string;
      expose?: string;
      remote?: RemoteLike;
      remoteInfo?: RemoteLike;
      origin?: Origin;
    }) {
      recordFederationEvent({
        type: 'afterResolve',
        instance: instanceName(args.origin),
        id: args.id,
        remote: args.remoteInfo?.name ?? args.remote?.name,
        url: args.remoteInfo?.entry ?? args.remote?.entry,
        detail: args.expose,
      });
      return args;
    },

    onLoad(args: {
      id: string;
      expose?: string;
      remote?: RemoteLike;
      origin?: Origin;
    }) {
      recordFederationEvent({
        type: 'onLoad',
        instance: instanceName(args.origin),
        id: args.id,
        remote: args.remote?.name,
        detail: args.expose,
      });
    },

    errorLoadRemote(args: {
      id: string;
      error: unknown;
      lifecycle?: string;
      from?: string;
      remote?: RemoteLike;
      origin?: Origin;
    }) {
      const error = describeError(args.error);
      recordFederationEvent({
        type: 'errorLoadRemote',
        instance: instanceName(args.origin),
        id: args.id,
        remote: args.remote?.name,
        url: args.remote?.entry,
        error: truncate(error.message),
        detail: [args.lifecycle, args.from].filter(Boolean).join(' | '),
      });
      recordError({
        source: 'federation',
        name: error.name,
        message: `Failed to load remote "${args.id}" (${args.lifecycle ?? 'unknown lifecycle'}): ${error.message}`,
        stack: error.stack,
        ref: args.id,
      });
      // Returning undefined keeps MF's own error handling in charge.
      return undefined;
    },

    afterLoadShare(args: {
      pkgName: string;
      selectedShared?: { version?: string; from?: string };
      shareInfo?: { version?: string };
      lifecycle?: string;
      origin?: Origin;
    }) {
      recordFederationEvent({
        type: 'afterLoadShare',
        instance: instanceName(args.origin),
        id: args.pkgName,
        version: args.selectedShared?.version,
        detail: [
          args.selectedShared?.from && `from ${args.selectedShared.from}`,
          args.shareInfo?.version && `requested ${args.shareInfo.version}`,
          args.lifecycle,
        ]
          .filter(Boolean)
          .join(' | '),
      });
    },

    errorLoadShare(args: {
      pkgName: string;
      error?: unknown;
      lifecycle?: string;
      recovered?: boolean;
      origin?: Origin;
    }) {
      recordFederationEvent({
        type: 'errorLoadShare',
        instance: instanceName(args.origin),
        id: args.pkgName,
        error: errorMessage(args.error),
        detail: [args.lifecycle, args.recovered ? 'recovered' : undefined]
          .filter(Boolean)
          .join(' | '),
      });
      if (!args.recovered) {
        const error = describeError(args.error);
        recordError({
          source: 'federation',
          name: error.name,
          message: `Failed to load shared "${args.pkgName}": ${error.message}`,
          stack: error.stack,
          ref: args.pkgName,
        });
      }
    },

    afterLoadEntry(args: {
      remoteInfo?: RemoteLike;
      cached?: boolean;
      error?: unknown;
      recovered?: boolean;
      origin?: Origin;
    }) {
      recordFederationEvent({
        type: 'afterLoadEntry',
        instance: instanceName(args.origin),
        remote: args.remoteInfo?.name,
        url: args.remoteInfo?.entry,
        error: errorMessage(args.error),
        detail: [
          args.cached ? 'cached' : undefined,
          args.recovered ? 'recovered' : undefined,
        ]
          .filter(Boolean)
          .join(' | '),
      });
    },

    loadEntryError(args: {
      remoteInfo?: RemoteLike;
      uniqueKey?: string;
      origin?: Origin;
    }) {
      recordFederationEvent({
        type: 'loadEntryError',
        instance: instanceName(args.origin),
        remote: args.remoteInfo?.name,
        url: args.remoteInfo?.entry,
        detail: args.uniqueKey,
      });
      // Returning undefined keeps MF's own retry/fallback logic in charge.
      return undefined;
    },

    afterLoadManifest(args: {
      manifestUrl: string;
      moduleInfo?: RemoteLike;
      error?: unknown;
      cached?: boolean;
      recovered?: boolean;
      /** The fetch Response; MF parses it without checking `ok`. */
      response?: unknown;
      origin?: Origin;
    }) {
      const status = readNumber(args.response, 'status');
      recordFederationEvent({
        type: 'afterLoadManifest',
        instance: instanceName(args.origin),
        remote: args.moduleInfo?.name,
        url: args.manifestUrl,
        error: errorMessage(args.error),
        detail: [
          status !== undefined ? `HTTP ${status}` : undefined,
          args.cached ? 'cached' : undefined,
          args.recovered ? 'recovered' : undefined,
        ]
          .filter(Boolean)
          .join(' | '),
      });
    },

    beforePreloadRemote(args: {
      preloadOps?: Array<{ nameOrAlias?: string }>;
      origin?: Origin;
    }) {
      recordFederationEvent({
        type: 'beforePreloadRemote',
        instance: instanceName(args.origin),
        id: args.preloadOps?.map((op) => op.nameOrAlias).join(', '),
      });
    },

    afterPreloadRemote(args: {
      preloadOps?: Array<{ nameOrAlias?: string }>;
      error?: unknown;
      origin?: Origin;
    }) {
      recordFederationEvent({
        type: 'afterPreloadRemote',
        instance: instanceName(args.origin),
        id: args.preloadOps?.map((op) => op.nameOrAlias).join(', '),
        error: errorMessage(args.error),
      });
    },
  };
};

export default createRepackDevToolsRuntimePlugin;
