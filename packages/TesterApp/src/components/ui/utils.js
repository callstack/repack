import { useColorScheme } from 'react-native';

export const useIsDarkMode = () => useColorScheme() === 'dark';
