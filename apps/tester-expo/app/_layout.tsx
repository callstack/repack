import { Stack } from 'expo-router';
import { startDevTools, useDevTools } from '../components/rozenite';

// expo-router/entry is the app entry, so the root layout module is the
// earliest app code; start recording before the first render.
startDevTools();

export default function RootLayout() {
  useDevTools();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="details" options={{ title: 'Expo module' }} />
      <Stack.Screen name="image" options={{ title: 'Image' }} />
      <Stack.Screen name="density-image" options={{ title: 'Density image' }} />
      <Stack.Screen name="font" options={{ title: 'Font' }} />
      <Stack.Screen name="lazy" options={{ title: 'Lazy chunk' }} />
      <Stack.Screen name="widget" options={{ title: 'Expo widget' }} />
      <Stack.Screen
        name="ordinary-widget"
        options={{ title: 'Ordinary widget' }}
      />
      <Stack.Screen name="fast-refresh" options={{ title: 'Fast Refresh' }} />
      <Stack.Screen name="symbolication" options={{ title: 'Symbolication' }} />
    </Stack>
  );
}
