import React from 'react';
import { Appearance } from 'react-native';

import { AppContainer } from './ui/AppContainer';
import { Section } from './ui/Section';
import { SectionContainer } from './ui/SectionContainer';

import { AsyncContainer } from './asyncChunks/AsyncContainer';
import { RemoteContainer } from './remoteChunks/RemoteContainer';
import { MiniAppsContainer } from './miniapp/MiniAppsContainer';
import { AssetsTestContainer } from './assetsTest/AssetsTestContainer';
import DeprecatedRemoteDebuggerContainer from './deprecatedRemoteDebugger/DeprecatedRemoteDebuggerContainer';

Appearance.setColorScheme('light');

const App = () => {
  console.log(
    'Bridgeless: ',
    ('RN$Bridgeless' in global && RN$Bridgeless === true) || false
  );

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
        <Section title="Deprecated remote debugger">
          <DeprecatedRemoteDebuggerContainer />
        </Section>
      </SectionContainer>
    </AppContainer>
  );
};

export default App;
