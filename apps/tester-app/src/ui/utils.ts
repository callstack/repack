import { useColorScheme } from 'react-native';
import { Colors } from './colors';

export const useIsDarkMode = () => useColorScheme() === 'dark';

export const getDefaultBackgroundStyle = (isDarkMode: boolean) => ({
  backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
});
