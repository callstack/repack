import React from 'react';
import { View } from 'react-native';
import { Colors, Header } from 'react-native/Libraries/NewAppScreen';

import type { WithChildren } from './types';
import DeveloperActivitySvg from './undraw_Developer_activity_re_39tg.svg';
import { useIsDarkMode } from './utils';

type SectionContainerProps = WithChildren<{}>;

export function SectionContainer({ children }: SectionContainerProps) {
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
