/* global ZenObservable */
import * as React from 'react';
import Observable from 'zen-observable';

export type DevServerMessage =
  | {
      type: 'init' | 'open' | 'close';
    }
  | {
      type: 'message';
      payload:
        | {
            kind: 'server-log';
            log: {
              issuer: string;
              message: any[];
              timestamp: number;
              type: 'debug' | 'info' | 'warn' | 'error';
            };
          }
        | {
            kind: 'progress';
            value: number;
            platform: string;
            label: string;
          };
    };

export interface DevServerCtx {
  getConnection: () => Observable<DevServerMessage>;
}

export const DevServerContext = React.createContext<DevServerCtx>({
  getConnection: () => Observable.of(),
});

export function DevServerProvider({ children }: { children: React.ReactNode }) {
  const socketRef = React.useRef<WebSocket>();
  const observersRef = React.useRef<
    Array<ZenObservable.SubscriptionObserver<DevServerMessage>>
  >([]);
  const initConnectionRef = React.useRef(() => {
    socketRef.current = new WebSocket('ws://localhost:8081/api/dashboard');

    socketRef.current.addEventListener('open', () => {
      for (const observer of observersRef.current) {
        observer.next({ type: 'open' });
      }
    });

    socketRef.current.addEventListener('close', () => {
      for (const observer of observersRef.current) {
        observer.next({ type: 'close' });
      }

      socketRef.current = undefined;
      setTimeout(() => initConnectionRef.current(), 5000);
    });

    socketRef.current.addEventListener('error', (error) => {
      console.error(error);
    });

    socketRef.current.addEventListener('message', (message) => {
      for (const observer of observersRef.current) {
        observer.next({
          type: 'message',
          payload: JSON.parse(message.data.toString()),
        });
      }
    });
  });

  const connectionRef = React.useRef(
    new Observable<DevServerMessage>((observer) => {
      observersRef.current.push(observer);

      return () => {
        observersRef.current = observersRef.current.filter(
          (item) => item !== observer
        );
      };
    })
  );

  React.useEffect(() => {
    initConnectionRef.current();

    return () => socketRef.current?.close();
  }, []);

  return (
    <DevServerContext.Provider
      value={React.useMemo(
        () => ({
          getConnection: () => connectionRef.current,
        }),
        []
      )}
    >
      {children}
    </DevServerContext.Provider>
  );
}
