import React from 'react';
import { View } from 'react-native';
import { useIsDarkMode } from './utils';
import { Colors, Header } from 'react-native/Libraries/NewAppScreen';
// @ts-ignore
import DeveloperActivitySvg from './undraw_Developer_activity_re_39tg.svg';


export function SectionContainer({ children }) {
  const isDarkMode = useIsDarkMode();
  return (
    <>
      <Header />
      <DeveloperActivitySvg width="100%" height="400" />
      <View
        style={{
          backgroundColor: isDarkMode ? Colors.black : Colors.white,
        }}
      >
        {children}
      </View>
    </>
  );
}
