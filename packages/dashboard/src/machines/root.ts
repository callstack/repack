import { createMachine, actions, spawn, ActorRefFrom } from 'xstate';
import { LogEntry } from '../types';
import { proxyConnectionMachine } from './proxyConnection';
import { serverLogsMachine } from './serverLogs';

const { assign, send } = actions;

export interface RootContext {
  proxyConnectionRef: ActorRefFrom<typeof proxyConnectionMachine> | null;
  serverLogsRef: ActorRefFrom<typeof serverLogsMachine> | null;
}

export type RootEvents = { type: 'PROXY_CONNECTION.SERVER_LOG'; log: LogEntry };

export const rootMachine = createMachine<RootContext, RootEvents>(
  {
    id: 'root',
    initial: 'init',
    strict: true,
    context: {
      proxyConnectionRef: null,
      serverLogsRef: null,
    },
    states: {
      init: {
        entry: [
          assign({
            proxyConnectionRef: (_) =>
              spawn(proxyConnectionMachine, {
                name: 'proxyConnection',
              }),
            serverLogsRef: (_) =>
              spawn(serverLogsMachine, {
                name: 'serverLogs',
              }),
          }),
        ],
        always: [{ target: 'running' }],
      },
      running: {
        on: {
          'PROXY_CONNECTION.SERVER_LOG': {
            actions: 'forwardToServerLog',
          },
        },
      },
    },
  },
  {
    actions: {
      forwardToServerLog: send((_, event) => event, {
        to: (context) => context.serverLogsRef!,
      }),
    },
  }
);
