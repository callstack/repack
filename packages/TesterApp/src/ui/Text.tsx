import React from 'react';
import { Text as RNText, StyleProp, TextStyle } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';

import { useIsDarkMode } from './utils';
import { WithChildren } from './types';

type TextProps = WithChildren<{
  colorLight: string;
  colorDark: string;
  style: StyleProp<TextStyle>;
}>;

export function Text({ colorLight, colorDark, children, style }: TextProps) {
  const isDarkMode = useIsDarkMode();

  const colorInDarkMode = colorLight ?? Colors.lighter;
  const colorInLightMode = colorDark ?? Colors.darker;

  const color = isDarkMode ? colorInDarkMode : colorInLightMode;

  return <RNText style={[{ color }, style]}>{children}</RNText>;
}
