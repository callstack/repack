import React from 'react';
import { Appearance } from 'react-native';

import { AppContainer } from './ui/AppContainer';
import { Section } from './ui/Section';
import { SectionContainer } from './ui/SectionContainer';

import { AsyncContainer } from './asyncChunks/AsyncContainer';
import { RemoteContainer } from './remoteChunks/RemoteContainer';
import { MiniAppsContainer } from './miniapp/MiniAppsContainer';
import { AssetsTestContainer } from './assetsTest/AssetsTestContainer';

Appearance.setColorScheme('light');

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
        <Section title="Assets test">
          <AssetsTestContainer />
        </Section>
      </SectionContainer>
    </AppContainer>
  );
};

export default App;
