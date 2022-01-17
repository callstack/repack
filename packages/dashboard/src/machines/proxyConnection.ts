import {
  createMachine,
  actions,
  spawn,
  ActorRef,
  sendParent,
  Sender,
} from 'xstate';
import { DASHBOARD_API_PATH, DEV_SERVER_WS_URL } from '../constants';
import { LogEntry, ProxyMessage } from '../types';

const { assign } = actions;

export interface ProxyConnectionContext {
  uiState: 'Connecting' | 'Connected' | 'Disconnected';
  attempt: number;
  timeoutDelay: number;
  reconnectDelay: number;
  maxAutoRetries: number;
  connectionRef: ActorRef<any> | null;
}

export type ProxyConnectionEvent =
  | {
      type: 'CONNECTED' | 'DISCONNECTED' | 'RESET';
    }
  | {
      type: 'SERVER_LOG';
      log: LogEntry;
    };

export const proxyConnectionMachine = createMachine<
  ProxyConnectionContext,
  ProxyConnectionEvent
>(
  {
    id: 'proxyConnection',
    initial: 'connecting',
    strict: true,
    context: {
      uiState: 'Connecting',
      attempt: 0,
      timeoutDelay: 5000,
      reconnectDelay: 5000,
      maxAutoRetries: 5,
      connectionRef: null,
    },
    states: {
      connecting: {
        entry: ['initConnection', 'incrementAttempt', 'setConnectingUiState'],
        on: {
          CONNECTED: 'connected',
          DISCONNECTED: 'disconnected',
        },
        after: [
          { delay: (context) => context.timeoutDelay, target: 'disconnected' },
        ],
      },
      connected: {
        entry: ['setConnectedUiState'],
        on: {
          DISCONNECTED: {
            target: 'disconnected',
            actions: 'resetAttempt',
          },
          SERVER_LOG: {
            actions: sendParent((_, event) => ({
              type: 'PROXY_CONNECTION.SERVER_LOG',
              log: event.log,
            })),
          },
        },
      },
      disconnected: {
        entry: ['setConnectingUiState', 'disposeConnection'],
        always: [
          {
            target: 'failed',
            cond: 'attemptsExhausted',
          },
        ],
        after: [
          {
            delay: (context) => context.reconnectDelay,
            target: 'connecting',
            cond: 'hasAttemptsLeft',
          },
        ],
      },
      failed: {
        entry: ['setDisconnectedUiState'],
        on: {
          RESET: {
            target: 'connecting',
            actions: 'resetAttempt',
          },
        },
      },
    },
  },
  {
    actions: {
      resetAttempt: assign({
        attempt: (_) => 0,
      }),
      incrementAttempt: assign({
        attempt: (context) => context.attempt + 1,
      }),
      disposeConnection: assign({
        connectionRef: (context) => {
          context.connectionRef?.stop?.();
          return null;
        },
      }),
      initConnection: assign({
        connectionRef: (context) => {
          context.connectionRef?.stop?.();

          return spawn(
            (callback: Sender<ProxyConnectionEvent>, _receive) => {
              const address = `${DEV_SERVER_WS_URL}${DASHBOARD_API_PATH}`;
              const socket = new WebSocket(address);

              const onOpen = () => {
                callback({ type: 'CONNECTED' });
              };
              const onClose = () => {
                callback({ type: 'DISCONNECTED' });
              };
              const onError = () => {
                callback({ type: 'DISCONNECTED' });
              };
              const onMessage = (event: MessageEvent) => {
                try {
                  const data: ProxyMessage = JSON.parse(event.data.toString());
                  if (data.kind === 'server-log') {
                    callback({ type: 'SERVER_LOG', log: data.log });
                  } else {
                    console.warn('Unknown dev server proxy message:', data);
                  }
                } catch (error) {
                  console.error(
                    'Error parsing dev server proxy message:',
                    error
                  );
                }
              };

              socket.addEventListener('open', onOpen);
              socket.addEventListener('close', onClose);
              socket.addEventListener('error', onError);
              socket.addEventListener('message', onMessage);

              return () => {
                socket.removeEventListener('open', onOpen);
                socket.removeEventListener('close', onClose);
                socket.removeEventListener('error', onError);
                socket.removeEventListener('message', onMessage);
                socket.close();
              };
            },
            {
              name: 'connection',
            }
          );
        },
      }),
      setConnectingUiState: assign({
        uiState: (_) => 'Connecting',
      }),
      setConnectedUiState: assign({
        uiState: (_) => 'Connected',
      }),
      setDisconnectedUiState: assign({
        uiState: (_) => 'Disconnected',
      }),
    },
    guards: {
      hasAttemptsLeft: (context) => context.attempt < context.maxAutoRetries,
      attemptsExhausted: (context) => context.attempt >= context.maxAutoRetries,
    },
  }
);
