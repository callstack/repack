import { createMachine, actions, DoneInvokeEvent } from 'xstate';
import { LogEntry } from '../types';
import { fetchServerLogs } from '../utils/fetchServerLogs';

const { assign } = actions;

export interface ServerLogsContext {
  logs: LogEntry[];
  logsLimit: number;
}

export type ServerLogsEvent =
  | {
      type: 'PROXY_CONNECTION.SERVER_LOG';
      log: LogEntry;
    }
  | {
      type: 'CLEAR_LOGS';
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
      logsLimit: 500,
    },
    states: {
      loading: {
        invoke: {
          src: 'fetchBufferedLogs',
          onDone: {
            target: 'listening',
            actions: assign({
              logs: (context, event: DoneInvokeEvent<LogEntry[]>) => {
                if (event.type !== 'done.invoke.fetchBufferedLogs') {
                  return context.logs;
                }

                return context.logs
                  .concat(...event.data)
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .filter((log, index, array) => {
                    const hasDuplicate = array.some(
                      (otherLog, otherIndex) =>
                        otherLog.timestamp === log.timestamp &&
                        otherIndex !== index
                    );
                    return !hasDuplicate;
                  });
              },
            }),
          },
          onError: {
            target: 'listening',
          },
        },
        on: {
          'PROXY_CONNECTION.SERVER_LOG': {
            actions: 'pushLog',
          },
        },
      },
      listening: {
        on: {
          'PROXY_CONNECTION.SERVER_LOG': {
            actions: 'pushLog',
          },
          CLEAR_LOGS: {
            actions: 'clearLogs',
          },
        },
      },
    },
  },
  {
    actions: {
      pushLog: assign({
        logs: (context, event) =>
          event.type === 'PROXY_CONNECTION.SERVER_LOG'
            ? context.logs.concat(event.log).slice(-context.logsLimit)
            : context.logs,
      }),
      clearLogs: assign({
        logs: (_) => [],
      }),
    },
    services: {
      fetchBufferedLogs: () => fetchServerLogs(),
    },
  }
);
