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

// ScriptManager caches remote scripts in AsyncStorage only when the host runs
// with WITH_PRELOAD=true (see index.js); otherwise this store stays empty.
const storages = [
  createAsyncStorageAdapter({ storages: { ScriptManager: AsyncStorage } }),
];

export function startDevTools() {
  withOnBootNetworkActivityRecording();
}

export function useDevTools(
  navigationRef: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>
) {
  useNetworkActivityDevTools();
  useReactNavigationDevTools({ ref: navigationRef });
  useRozeniteStoragePlugin({ storages });
}
