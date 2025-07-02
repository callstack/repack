import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';
import { Colors } from './colors';
import type { WithChildren } from './types';
import { useIsDarkMode } from './utils';

type TextProps = WithChildren<{
  colorLight?: string;
  colorDark?: string;
  style?: StyleProp<TextStyle>;
}>;

export function Text({ colorLight, colorDark, children, style }: TextProps) {
  const isDarkMode = useIsDarkMode();

  const colorInDarkMode = colorLight ?? Colors.lighter;
  const colorInLightMode = colorDark ?? Colors.darker;

  const color = isDarkMode ? colorInDarkMode : colorInLightMode;

  return <RNText style={[{ color }, style]}>{children}</RNText>;
}
