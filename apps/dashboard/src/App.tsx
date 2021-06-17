import React from 'react';
import { Artifacts } from './screens/artifacts/Artifacts';
import { Layout } from './components/Layout';
import { Welcome } from './screens/welcome/Welcome';

const tabs = [
  {
    label: 'Build Artifacts',
    body: Artifacts,
  },
];

export const App = () => {
  return <Layout tabs={tabs} welcome={Welcome} />;
};
