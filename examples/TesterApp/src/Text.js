import React from 'react';
import { Text as NativeText, useColorScheme } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';

export function Text({ children }) {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <NativeText style={{ color: isDarkMode ? Colors.lighter : Colors.darker }}>
      {children}
    </NativeText>
  );
}
