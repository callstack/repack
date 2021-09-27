import * as React from 'react';
import Observable from 'zen-observable';
import {
  DASHBOARD_API_PATH,
  DEV_SERVER_WS_URL,
  getCompilerWebSocketUrl,
} from '../../constants';
import { fetchPlatforms } from '../../utils/fetchPlatforms';
import { DevServerMessage } from './types';
import { Context } from './Context';
import { createWebSocketObservable } from './utils/createWebSocketObservable';

export function DevServerProvider({ children }: { children: React.ReactNode }) {
  const proxyRef = React.useRef(
    createWebSocketObservable(`${DEV_SERVER_WS_URL}${DASHBOARD_API_PATH}`)
  );
  const [compilers, setCompilers] = React.useState<
    Record<string, Observable<DevServerMessage>>
  >({});

  const createCompilerConnection = React.useCallback(
    (platform: string, port: number) => {
      setCompilers((compilers) => ({
        ...compilers,
        [platform]: createWebSocketObservable(
          `${getCompilerWebSocketUrl(port)}${DASHBOARD_API_PATH}`
        ),
      }));
    },
    []
  );

  React.useEffect(() => {
    (async () => {
      try {
        for (const platform of await fetchPlatforms()) {
          createCompilerConnection(platform.id, platform.port);
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [createCompilerConnection]);

  React.useEffect(() => {
    proxyRef.current.subscribe({
      next: (value) => {
        if (
          value.type === 'message' &&
          value.payload.kind === 'compilation' &&
          value.payload.event.name === 'watchRun'
        ) {
          const { port, platform } = value.payload.event;
          createCompilerConnection(platform, port);
        }
      },
    });
  }, [createCompilerConnection]);

  return (
    <Context.Provider
      value={React.useMemo(
        () => ({
          getPlatforms: () => Object.keys(compilers),
          getProxyConnection: () => proxyRef.current,
          getCompilerConnection: (platform) => compilers[platform],
        }),
        [compilers]
      )}
    >
      {children}
    </Context.Provider>
  );
}
