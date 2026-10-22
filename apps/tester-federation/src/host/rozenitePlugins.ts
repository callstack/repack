import {
  installRepackDevTools,
  useRepackDevTools,
} from '@callstack/repack-devtools-plugin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import {
  useNetworkActivityDevTools,
  withOnBootNetworkActivityRecording,
} from '@rozenite/network-activity-plugin';
import { useReactNavigationDevTools } from '@rozenite/react-navigation-plugin';
import {
  createAsyncStorageAdapter,
  useRozeniteStoragePlugin,
} from '@rozenite/storage-plugin';

// ScriptManager caches remote scripts in AsyncStorage (see index.js).
const storages = [
  createAsyncStorageAdapter({ storages: { ScriptManager: AsyncStorage } }),
];

export function startDevTools() {
  installRepackDevTools({ boot: true });
  withOnBootNetworkActivityRecording();
}

export function useDevTools(
  navigationRef: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>
) {
  useRepackDevTools();
  useNetworkActivityDevTools();
  useReactNavigationDevTools({ ref: navigationRef });
  useRozeniteStoragePlugin({ storages });
}
