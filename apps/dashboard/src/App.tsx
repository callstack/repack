import React from 'react';
import { Artifacts } from './components/Artifacts';
import { Layout } from './components/Layout';

const tabs = [
  {
    label: 'Build Artifacts',
    body: Artifacts,
  },
];

export const App = () => {
  return <Layout tabs={tabs} />;
};
