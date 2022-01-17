import { createMachine, actions, DoneInvokeEvent } from 'xstate';
import { LogEntry } from '../types';
import { fetchServerLogs } from '../utils/fetchServerLogs';

const { assign } = actions;

export interface ServerLogsContext {
  logs: LogEntry[];
}

export type ServerLogsEvent = {
  type: 'PROXY_CONNECTION.SERVER_LOG';
  log: LogEntry;
};

export const serverLogsMachine = createMachine<
  ServerLogsContext,
  ServerLogsEvent
>(
  {
    id: 'serverLogs',
    initial: 'loading',
    strict: true,
    context: {
      logs: [],
    },
    states: {
      loading: {
        invoke: {
          src: 'fetchBufferedLogs',
          onDone: {
            target: 'listening',
            actions: assign({
              logs: (context, event: DoneInvokeEvent<LogEntry[]>) =>
                context.logs
                  .concat(event.data)
                  .sort((a, b) => a.timestamp - b.timestamp),
            }),
          },
          onError: {
            target: 'listening',
          },
        },
        on: {
          'PROXY_CONNECTION.SERVER_LOG': {
            actions: 'pushServerLog',
          },
        },
      },
      listening: {
        on: {
          'PROXY_CONNECTION.SERVER_LOG': {
            actions: 'pushServerLog',
          },
        },
      },
    },
  },
  {
    actions: {
      pushServerLog: assign({
        logs: (context, event) =>
          event.type === 'PROXY_CONNECTION.SERVER_LOG'
            ? context.logs.concat(event.log)
            : context.logs,
      }),
    },
    services: {
      fetchBufferedLogs: () => fetchServerLogs(),
    },
  }
);
