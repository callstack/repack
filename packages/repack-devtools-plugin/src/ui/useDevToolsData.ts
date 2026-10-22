import {
  createRozeniteRpc,
  useRozeniteDevToolsClient,
} from '@rozenite/plugin-bridge';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEV_SERVER_ROUTE, PLUGIN_ID } from '../shared/constants';
import { isDevServerState } from '../shared/guards';
import type {
  PanelSnapshot,
  RepackDevToolsEventMap,
  RepackDevToolsMethods,
} from '../shared/messaging';
import type { DevServerState } from '../shared/types';

export const useAppData = () => {
  const client = useRozeniteDevToolsClient<RepackDevToolsEventMap>({
    pluginId: PLUGIN_ID,
  });
  const rpc = useMemo(
    () => (client ? createRozeniteRpc<RepackDevToolsMethods>(client) : null),
    [client]
  );
  const [snapshot, setSnapshot] = useState<PanelSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  const refresh = useCallback(async () => {
    if (!rpc || pending.current) return;
    pending.current = true;
    try {
      setSnapshot(await rpc.method('getSnapshot').invoke());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      pending.current = false;
    }
  }, [rpc]);

  useEffect(() => {
    if (!client || !rpc) return;
    void refresh();
    const subscription = client.onMessage('state-changed', () => {
      void refresh();
    });
    return () => {
      subscription.remove();
      rpc.close();
    };
  }, [client, rpc, refresh]);

  return { connected: !!client, rpc, snapshot, error, refresh };
};

/** Dev-server state is served by the same origin as the panel itself. */
export const useDevServerData = (intervalMs = 2000) => {
  const [state, setState] = useState<DevServerState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${DEV_SERVER_ROUTE}/state`);
      if (!response.ok) {
        throw new Error(
          `${DEV_SERVER_ROUTE}/state responded with ${response.status}; is the config wrapped with withRepackDevTools?`
        );
      }
      const body: unknown = await response.json();
      if (!isDevServerState(body)) {
        throw new Error(
          `${DEV_SERVER_ROUTE}/state returned an unexpected payload.`
        );
      }
      setState(body);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  const clearRequests = useCallback(async () => {
    await fetch(`${DEV_SERVER_ROUTE}/clear`, { method: 'POST' });
    await refresh();
  }, [refresh]);

  return { state, error, refresh, clearRequests };
};
