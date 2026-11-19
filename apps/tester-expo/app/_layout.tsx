import { Stack } from 'expo-router';
import { startDevTools, useDevTools } from '../components/rozenite';

// expo-router/entry is the app entry, so the root layout module is the
// earliest app code; start recording before the first render.
startDevTools();

export default function RootLayout() {
  useDevTools();

  return <Stack />;
}
