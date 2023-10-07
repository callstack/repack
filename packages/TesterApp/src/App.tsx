import React, { useRef } from 'react';
import { AppContainer } from './ui/AppContainer';
import { Section } from './ui/Section';
import { SectionContainer } from './ui/SectionContainer';

const App = () => {
  const oldTime = useRef(performance.now());

  const now = performance.now();
  console.log('🚀 HMR TIME', (now - oldTime.current).toFixed(0));
  oldTime.current = now;

  return (
    <AppContainer>
      <SectionContainer>
        <Section title="Async chunk"></Section>
        <Section title="Remote chunks"></Section>
        <Section title="Mini-apps"></Section>
        <Section title="Assets test"></Section>
      </SectionContainer>
    </AppContainer>
  );
};

export default App;
