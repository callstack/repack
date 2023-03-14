import React from 'react';
import codePush from 'react-native-code-push';

import { AppContainer } from './ui/AppContainer';
import { Section } from './ui/Section';
import { SectionContainer } from './ui/SectionContainer';

import { AsyncContainer } from './asyncChunks/AsyncContainer';
import { RemoteContainer } from './remoteChunks/RemoteContainer';
import { MiniAppsContainer } from './miniapp/MiniAppsContainer';
import { CodePushDemoContainer } from './CodePushDemoContainer';

let codePushOptions = { checkFrequency: codePush.CheckFrequency.ON_APP_RESUME };

const App = () => {
  return (
    <AppContainer>
      <SectionContainer>
        <Section title="CodePush demo. App version:">
          <CodePushDemoContainer />
        </Section>
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

export default codePush(codePushOptions)(App);
