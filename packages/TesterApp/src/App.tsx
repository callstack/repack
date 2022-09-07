import React from 'react';

import { AppContainer } from './components/ui/AppContainer';
import { Section } from './components/ui/Section';
import { SectionContainer } from './components/ui/SectionContainer';

import { RemoteContainer } from './components/remoteChunks/RemoteContainer';
import { AsyncContainer } from './components/asyncChunks/AsyncContainer';
import { MiniAppsContainer } from './components/miniapp/MiniAppsContainer';

const App = () => {
  return (
    <AppContainer>
      <SectionContainer>
        <Section title="Async chunk">
          <AsyncContainer />
        </Section>
        <Section title="Remote chunks">
          <RemoteContainer />
        </Section>
        <Section title="Mini-apps">
          <MiniAppsContainer />
        </Section>
      </SectionContainer>
    </AppContainer>
  );
};

export default App;
