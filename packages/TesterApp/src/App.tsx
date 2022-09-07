import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, View } from 'react-native';
import { Colors, Header } from 'react-native/Libraries/NewAppScreen';
import { useIsDarkMode } from './components/ui/utils';
// @ts-ignore
import DeveloperActivitySvg from './undraw_Developer_activity_re_39tg.svg';

import { RemoteContainer } from './components/remoteChunks/RemoteContainer';
import { AsyncContainer } from './components/asyncChunks/AsyncContainer';
import { Section } from './components/ui/Section';
import { MiniAppsContainer } from './components/miniapp/MiniAppsContainer';

const App = () => {
  const isDarkMode = useIsDarkMode();
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}
      >
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}
        >
          <DeveloperActivitySvg width="100%" height="400" />
          <Section title="Async chunk">
            <AsyncContainer />
          </Section>
          <Section title="Remote chunks">
            <RemoteContainer />
          </Section>
          <Section title="Mini-apps">
            <MiniAppsContainer />
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;
