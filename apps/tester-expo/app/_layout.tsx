import { useRepackDevTools } from '@callstack/repack-devtools-plugin';
import { useNetworkActivityDevTools } from '@rozenite/network-activity-plugin';
import { Stack } from 'expo-router';

export default function RootLayout() {
  useNetworkActivityDevTools();
  useRepackDevTools();

  return <Stack />;
}
