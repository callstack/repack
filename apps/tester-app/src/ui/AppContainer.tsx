import React from 'react';

import { SafeAreaView, ScrollView, StatusBar } from 'react-native';

import type { WithChildren } from './types';
import { getDefaultBackgroundStyle, useIsDarkMode } from './utils';

type AppContainerProps = WithChildren<{}>;

export function AppContainer({ children }: AppContainerProps) {
  const isDarkMode = useIsDarkMode();
  const backgroundStyle = getDefaultBackgroundStyle(isDarkMode);

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
