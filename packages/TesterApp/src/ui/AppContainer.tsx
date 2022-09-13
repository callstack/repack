import React from 'react';

import { SafeAreaView, ScrollView, StatusBar } from 'react-native';

import { useIsDarkMode, getDefaultBackgroundStyle } from './utils';
import { WithChildren } from './types';

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
