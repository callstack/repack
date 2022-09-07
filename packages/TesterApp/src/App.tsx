import React from 'react';
import { SafeAreaView, ScrollView, StatusBar } from 'react-native';

import {
  useIsDarkMode,
  getDefaultBackgroundStyle,
} from './components/ui/utils';
import { Section } from './components/ui/Section';
import { SectionContainer } from './components/ui/SectionContainer';

import { RemoteContainer } from './components/remoteChunks/RemoteContainer';
import { AsyncContainer } from './components/asyncChunks/AsyncContainer';
import { MiniAppsContainer } from './components/miniapp/MiniAppsContainer';

const App = () => {
  const isDarkMode = useIsDarkMode();
  const backgroundStyle = getDefaultBackgroundStyle(isDarkMode);

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}
      >
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;
