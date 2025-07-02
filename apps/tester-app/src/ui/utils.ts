import { useColorScheme } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';

export const useIsDarkMode = () => useColorScheme() === 'dark';

export const getDefaultBackgroundStyle = (isDarkMode: boolean) => ({
  backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
});
