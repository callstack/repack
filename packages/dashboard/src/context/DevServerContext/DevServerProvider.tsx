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
  const proxy = React.useMemo(
    () =>
      createWebSocketObservable(`${DEV_SERVER_WS_URL}${DASHBOARD_API_PATH}`),
    []
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
    proxy.subscribe({
      next: (value) => {
        if (
          value.type === 'message' &&
          value.payload.kind === 'compilation' &&
          value.payload.event.name === 'watchRun'
        ) {
          const { port, platform } = value.payload.event;
          createCompilerConnection(platform, port);
        }

        if (value.type === 'close') {
          setCompilers({});
        }
      },
    });
  }, [createCompilerConnection, proxy]);

  return (
    <Context.Provider
      value={React.useMemo(
        () => ({
          getPlatforms: () => Object.keys(compilers),
          getProxyConnection: () => proxy,
          getCompilerConnection: (platform) => compilers[platform],
        }),
        [compilers, proxy]
      )}
    >
      {children}
    </Context.Provider>
  );
}
