import { Stack } from 'expo-router';
import { useDevTools } from '../components/rozenite';

export default function RootLayout() {
  useDevTools();

  return <Stack />;
}
