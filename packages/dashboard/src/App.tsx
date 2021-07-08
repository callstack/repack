import React from 'react';
import { createOvermind, IConfig } from 'overmind';
import { namespaced } from 'overmind/config';
import { Provider } from 'overmind-react';
import { Artifacts } from './tools/artifacts/Artifacts';
import { Layout } from './components/Layout';
import { Welcome } from './tools/welcome/Welcome';
import { ServerLogs, config as serverLogsConfig } from './tools/server-logs';

const config = namespaced({
  serverLogs: serverLogsConfig,
});
const overmind = createOvermind(config);

declare module 'overmind' {
  interface Config extends IConfig<typeof config> {}
}

const tabs = [
  {
    label: 'Build Artifacts',
    body: Artifacts,
  },
  {
    label: 'Client Logs',
    body: () => null,
  },
  {
    label: 'Server Logs',
    body: ServerLogs,
  },
];

export const App = () => {
  return (
    <Provider value={overmind}>
      <Layout tabs={tabs} welcome={Welcome} />
    </Provider>
  );
};
