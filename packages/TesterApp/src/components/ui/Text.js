import React from 'react';
import { Text as NativeText } from 'react-native';
import { useIsDarkMode } from './utils';
import { Colors } from 'react-native/Libraries/NewAppScreen';

export function Text({ colorLight, colorDark, children, style }) {
  const isDarkMode = useIsDarkMode();

  const colorInDarkMode = colorLight ?? Colors.lighter;
  const colorInLightMode = colorDark ?? Colors.darker;

  const color = isDarkMode ? colorInDarkMode : colorInLightMode;

  return <NativeText style={[{ color }, style]}>{children}</NativeText>;
}