import {
  createRozeniteRpc,
  useRozeniteDevToolsClient,
} from '@rozenite/plugin-bridge';
import { useEffect, useState } from 'react';
import { PLUGIN_ID } from '../shared/constants';
import type {
  PanelSnapshot,
  RepackDevToolsEventMap,
  RepackDevToolsMethods,
} from '../shared/messaging';
import {
  clear,
  getFederation,
  getOverview,
  invalidateScripts,
  loadRemote,
  loadScript,
  prefetchScript,
  reload,
  symbolicate,
} from './api';
import { getAppInfo } from './environment';
import { installRepackDevTools } from './install';
import { getStore, subscribe } from './store';
import { useRepackDevToolsAgentTools } from './useRepackDevToolsAgentTools';

const PANEL_EVENT_LIMIT = 200;

const getSnapshot = (): PanelSnapshot => {
  const store = getStore();
  return {
    app: getAppInfo(),
    scripts: Array.from(store.scripts.values()),
    scriptEvents: store.scriptEvents.slice(-PANEL_EVENT_LIMIT),
    federation: getFederation(),
    federationEvents: store.federationEvents.slice(-PANEL_EVENT_LIMIT),
    errors: store.errors,
  };
};

/**
 * Mount once near the app root. Starts recording (if the entry file did not
 * already call `installRepackDevTools`), serves the DevTools panels and
 * registers the `callstack/repack-devtools` agent tools.
 */
export const useRepackDevTools = () => {
  useState(() => {
    installRepackDevTools();
    return true;
  });

  const client = useRozeniteDevToolsClient<RepackDevToolsEventMap>({
    pluginId: PLUGIN_ID,
  });

  useEffect(() => {
    if (!client) return;
    const rpc = createRozeniteRpc<RepackDevToolsMethods>(client);
    const handlers = [
      rpc.handle('getSnapshot', async () => getSnapshot()),
      rpc.handle('getOverview', () => getOverview()),
      rpc.handle('loadScript', ({ scriptId, caller }) =>
        loadScript(scriptId, caller)
      ),
      rpc.handle('prefetchScript', ({ scriptId, caller }) =>
        prefetchScript(scriptId, caller)
      ),
      rpc.handle('invalidateScripts', ({ scriptIds }) =>
        invalidateScripts(scriptIds)
      ),
      rpc.handle('loadRemote', ({ id }) => loadRemote(id)),
      rpc.handle('symbolicate', (params) => symbolicate(params)),
      rpc.handle('clear', async ({ scope }) => clear(scope)),
      rpc.handle('reload', async () => reload()),
    ];
    const unsubscribe = subscribe(() => {
      client.send('state-changed', { at: Date.now() });
    });
    return () => {
      unsubscribe();
      for (const handler of handlers) handler.remove();
      rpc.close();
    };
  }, [client]);

  useRepackDevToolsAgentTools();
};
