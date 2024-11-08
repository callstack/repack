import { Appearance } from 'react-native';

import { AppContainer } from './ui/AppContainer';
import { Section } from './ui/Section';
import { SectionContainer } from './ui/SectionContainer';

import { AssetsTestContainer } from './assetsTest/AssetsTestContainer';
import { AsyncContainer } from './asyncChunks/AsyncContainer';
import { MiniAppsContainer } from './miniapp/MiniAppsContainer';
import { RemoteContainer } from './remoteChunks/RemoteContainer';

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
